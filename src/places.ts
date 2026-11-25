export interface SuggestedPlace {
  name: string
  lng: number
  lat: number
  description: string
  importance: number
  sourceUrl: string
  popularity: string
  kind: 'city' | 'attraction'
  pageId?: number
}

export interface PlaceBounds {
  west: number
  east: number
  south: number
  north: number
}

interface GeocodedPlace {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
  population?: number
}

interface WikiPage {
  title: string
  index: number
  pageid: number
  description?: string
  coordinates?: { lat: number; lon: number }[]
}

const cache = new Map<string, { time: number; places: SuggestedPlace[] }>()
const cacheLifetime = 30 * 60_000

interface PlacePreview {
  extract?: string
  thumbnail?: { source: string }
  pageimage?: string
}

const previews = new Map<number, PlacePreview>()

export async function loadPlacePreview(pageId: number, signal: AbortSignal): Promise<PlacePreview> {
  const cached = previews.get(pageId)
  if (cached) return cached
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    pageids: String(pageId), prop: 'extracts|pageimages',
    exintro: '1', explaintext: '1', exchars: '240',
    piprop: 'thumbnail|name', pithumbsize: '560', pilicense: 'free',
  })
  const response = await fetch('https://en.wikipedia.org/w/api.php?' + params, { signal })
  if (!response.ok) throw new Error('Place preview is unavailable.')
  const data: { error?: unknown; query?: { pages?: PlacePreview[] } } = await response.json()
  if (data.error) throw new Error('Place preview is unavailable.')
  signal.throwIfAborted()
  const preview = data.query?.pages?.[0] ?? {}
  previews.set(pageId, preview)
  if (previews.size > 80) previews.delete(previews.keys().next().value!)
  return preview
}

async function getPlaces(key: string, signal: AbortSignal | undefined, load: () => Promise<SuggestedPlace[]>) {
  signal?.throwIfAborted()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.time < cacheLifetime) return hit.places
  const places = await load()
  signal?.throwIfAborted()
  cache.delete(key)
  cache.set(key, { time: Date.now(), places })
  if (cache.size > 80) cache.delete(cache.keys().next().value!)
  return places
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SuggestedPlace[]> {
  const name = query.trim()
  if (name.length < 2) return []
  return getPlaces('town/' + name.toLowerCase(), signal, async () => {
    const params = new URLSearchParams({ name, count: '30', language: 'en', format: 'json' })
    const response = await fetch('https://geocoding-api.open-meteo.com/v1/search?' + params, { signal })
    if (!response.ok) throw new Error('Town search is temporarily unavailable.')
    const data: { results?: GeocodedPlace[] } = await response.json()
    return (data.results ?? []).map(place => ({
      name: place.name,
      kind: 'city',
      lng: place.longitude,
      lat: place.latitude,
      description: [place.admin1, place.country].filter(Boolean).join(', '),
      importance: place.population ?? 0,
      popularity: place.population ? place.population.toLocaleString() + ' residents' : '',
      sourceUrl: 'https://www.geonames.org/' + place.id,
    }))
  })
}

const wrapLongitude = (lng: number) => ((lng + 180) % 360 + 360) % 360 - 180
const radians = Math.PI / 180
const settlement = /\b(city|cities|town(ship)?|village|settlement|capital|municipality|suburb|neighbou?rhood|parish|borough)\b/i
const attraction = /\b(city hall|city park|town hall|museum|gallery|library|cathedral|church|mosque|synagogue|temple|shrine|monastery|abbey|palace|castle|fort(ress)?|tower|plaza|square|market|gardens?|parks?|reserve|heritage|landmark|monument|memorial|bridge|beach|island|lake|waterfall|mountain|volcano|archaeological|historic site|stadium|theat(er|re)|university|aquarium|zoo)\b/i
const isEvent = /\b(battle|massacre|earthquake|treaty|disaster|election|attack|bombing|siege|football club|political party|tournament|competition|airline|company|former country)\b/i
function destinationKind(description: string): SuggestedPlace['kind'] | undefined {
  const city = description.match(settlement)?.index ?? Infinity
  const site = description.match(attraction)?.index ?? Infinity
  if (city === Infinity && site === Infinity) return undefined
  return city < site ? 'city' : 'attraction'
}

async function searchWikipedia(query: string, limit: number, signal?: AbortSignal, sort = 'relevance'): Promise<WikiPage[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search',
    gsrnamespace: '0', gsrsearch: query, gsrsort: sort, gsrlimit: String(limit),
    prop: 'coordinates|description', colimit: String(limit),
  })
  const response = await fetch('https://en.wikipedia.org/w/api.php?' + params, {
    signal, headers: { 'Api-User-Agent': 'SlackLine/0.1 (UPenn HCI trip planner)' },
  })
  if (!response.ok) throw new Error('Wikipedia places are temporarily unavailable.')
  const data: { error?: unknown; query?: { pages?: WikiPage[] } } = await response.json()
  if (data.error) throw new Error('Wikipedia places are temporarily unavailable.')
  return (data.query?.pages ?? []).sort((a, b) => a.index - b.index)
}

export async function findCityArticle(place: SuggestedPlace, signal: AbortSignal) {
  const title = place.name.replaceAll('"', '')
  const near = `nearcoord:30km,${place.lat.toFixed(4)},${wrapLongitude(place.lng).toFixed(4)}`
  const pages = await searchWikipedia(`intitle:"${title}" ${near}`, 10, signal)
  return pages.find(page => page.description && !isEvent.test(page.description) && destinationKind(page.description) === 'city')
}

export async function suggestPlaces(bounds: PlaceBounds, signal?: AbortSignal): Promise<SuggestedPlace[]> {
  const width = bounds.east >= bounds.west ? bounds.east - bounds.west : (bounds.east - bounds.west + 360) % 360
  const height = bounds.north - bounds.south
  if (!Number.isFinite(width + height) || width <= 0 || height <= 0) return []
  const lat = (bounds.north + bounds.south) / 2
  const lng = wrapLongitude(bounds.west + width / 2)
  const kmPerLongitudeDegree = Math.max(1, 111.32 * Math.cos(lat * radians))
  const targetRadius = Math.hypot(height * 111.32, width * kmPerLongitudeDegree) * 0.6
  const radiusBucket = Math.ceil(4 * Math.log2(targetRadius)) / 4
  const radius = Math.min(1000, Math.max(1, Math.ceil(2 ** radiusBucket)))
  // Nearby pans share a rounded search circle. Clip cached candidates to the current viewport below.
  const gridKm = radius / 5
  const snap = (value: number, step: number) => Number((Math.round(value / step) * step).toFixed(4))
  const queryLat = Math.max(-89.999, Math.min(89.999, snap(lat, gridKm / 111.32)))
  const queryLatitudeBand = Math.round(queryLat / 5) * 5
  const longitudeScale = Math.max(1, 111.32 * Math.cos(queryLatitudeBand * radians))
  const queryLng = wrapLongitude(snap(lng, gridKm / longitudeScale)).toFixed(4)
  const area = radius + 'km,' + queryLat + ',' + queryLng

  const places = await getPlaces('wiki/' + area, signal, async () => {
    const pages = await searchWikipedia('nearcoord:' + area, 50, signal, 'incoming_links_desc')
    return pages.flatMap(page => {
      const coord = page.coordinates?.[0]
      const description = page.description
      const kind = description && destinationKind(description)
      if (!coord || !description || !kind || isEvent.test(description)) return []
      return [{
        name: page.title,
        lat: coord.lat,
        lng: coord.lon,
        description,
        kind,
        importance: 1 / page.index,
        popularity: '#' + page.index + ' nearby by Wikipedia incoming links',
        sourceUrl: 'https://en.wikipedia.org/?curid=' + page.pageid,
        pageId: page.pageid,
      }]
    })
  })

  return places.filter(place =>
    place.lat >= bounds.south && place.lat <= bounds.north &&
    (width >= 360 || ((place.lng - bounds.west) % 360 + 360) % 360 <= width)
  ).slice(0, 10)
}
