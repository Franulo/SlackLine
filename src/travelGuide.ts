interface GuideNote {
  label: string
  quote: string
}

interface TravelGuide {
  url: string
  notes: GuideNote[]
}

const guides = new Map<string, TravelGuide | null>()
const topics = [
  { heading: 'get around', label: 'Getting around', keywords: /\b(walk|walking|foot|bike|bicycle|ferry|tram|bus|metro|pass)\b/i },
  { heading: 'do', label: 'A small adventure', keywords: /\b(free|trail|hike|hiking|swim|viewpoint|walk|rent|sunset)\b/i },
  { heading: 'eat', label: 'Cheap eats', keywords: /\b(budget|cheap|inexpensive|market|bakery|street food|snack|canteen)\b/i },
  { heading: 'sleep', label: 'Budget beds', keywords: /\b(hostel|dorm|dormitory|camping|campsite|guesthouse)\b/i },
]

async function wikiRequest<T>(host: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  const response = await fetch('https://' + host + '/w/api.php?' + query, { signal })
  if (!response.ok) throw new Error('Travel guide is unavailable.')
  const data: T & { error?: unknown } = await response.json()
  if (data.error) throw new Error('Travel guide is unavailable.')
  return data
}

function readNotes(html: string): GuideNote[] {
  const template = document.createElement('template')
  template.innerHTML = html
  const notes = new Map<string, string>()
  let topic: typeof topics[number] | undefined
  for (const node of template.content.querySelectorAll('h2, p, li.vcard')) {
    if (node.tagName === 'H2') {
      topic = topics.find(item => item.heading === node.textContent?.trim().toLowerCase())
      continue
    }
    if (!topic || notes.has(topic.label) || node.closest('table, figure, .infobox')) continue
    const content = node.querySelector('.listing-content') ?? node
    const value = content.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const quote = value.match(/[^.!?]+[.!?](?=\s|$)|[^.!?]+$/g)?.map(sentence => sentence.trim())
      .find(sentence => sentence.length >= 32 && sentence.length <= 160 && topic?.keywords.test(sentence))
    if (quote) notes.set(topic.label, quote)
  }
  return topics.flatMap(({label}) => {
    const quote = notes.get(label)
    return quote ? [{label, quote}] : []
  }).slice(0, 3)
}

export async function loadTravelGuide(title: string, signal: AbortSignal): Promise<TravelGuide | null> {
  signal.throwIfAborted()
  const cached = guides.get(title)
  if (cached !== undefined) return cached

  const data = await wikiRequest<{ entities?: Record<string, { sitelinks?: { enwikivoyage?: { title: string } } }> }>(
    'www.wikidata.org',
    { action: 'wbgetentities', sites: 'enwiki', titles: title, props: 'sitelinks', sitefilter: 'enwikivoyage' },
    signal,
  )
  const guideTitle = Object.values(data.entities ?? {})[0]?.sitelinks?.enwikivoyage?.title
  let guide: TravelGuide | null = null
  if (guideTitle) {
    const article = await wikiRequest<{ parse?: { text?: string; revid?: number } }>('en.wikivoyage.org', {
      action: 'parse', page: guideTitle, prop: 'text|revid', redirects: '1', disableeditsection: '1',
    }, signal)
    guide = {
      url: article.parse?.revid
        ? 'https://en.wikivoyage.org/w/index.php?oldid=' + article.parse.revid
        : 'https://en.wikivoyage.org/wiki/' + encodeURIComponent(guideTitle.replaceAll(' ', '_')),
      notes: readNotes(article.parse?.text ?? ''),
    }
  }
  signal.throwIfAborted()
  guides.set(title, guide)
  if (guides.size > 80) guides.delete(guides.keys().next().value!)
  return guide
}
