export type Place = {name: string; lng: number; lat: number}
export type Stop = Place & {id: string; days: number; note: string}
export type Leg = {id: string; days: number; note: string}
export type Trip = {
  id: string; name: string; mode: 'open' | 'loop'; total: number
  stops: Stop[]; legs: Leg[]; startDate: string; absolute: boolean
}
const newLeg = (): Leg => ({id: crypto.randomUUID(), days: 0, note: ''})
const newStop = (place: Place): Stop => ({...place, id: crypto.randomUUID(), days: 1, note: ''})

export function createTrip(name: string, total: number, mode: Trip['mode'], from: Place, to: Place, startDate: string): Trip {
  const stops = (mode === 'loop' ? [to] : [from, to]).map(newStop)
  return {id: crypto.randomUUID(), name, total, mode, stops, legs: [newLeg()], startDate, absolute: false}
}
export function remaining(trip: Trip) {
  return trip.total - [...trip.stops, ...trip.legs].reduce((sum, item) => sum + item.days, 0)
}
export function allocate(trip: Trip, kind: 'stops' | 'legs', index: number, days: number): Trip {
  const item = trip[kind][index]
  if (!item || !Number.isFinite(days)) return trip
  const value = Math.max(kind === 'stops' ? 1 : 0, Math.min(Math.round(days), item.days + remaining(trip)))
  return {...trip, [kind]: trip[kind].map((entry, i) => i === index ? {...entry, days: value} : entry)}
}
export function insert(trip: Trip, index: number, place: Place): Trip {
  if (remaining(trip) < 1 || !trip.legs[index]) return trip
  return {...trip, stops: trip.stops.toSpliced(index + 1, 0, newStop(place)), legs: trip.legs.toSpliced(index + 1, 0, newLeg())}
}
export function removeStop(trip: Trip, index: number): Trip {
  if (index <= 0 || index >= trip.legs.length) return trip
  const first = trip.legs[index - 1], second = trip.legs[index]
  const merged = {...first, days: first.days + second.days, note: [first.note, second.note].filter(Boolean).join('\n')}
  return {...trip, stops: trip.stops.toSpliced(index, 1), legs: trip.legs.toSpliced(index - 1, 2, merged)}
}
export function distance(a: Place, b: Place) {
  const rad = Math.PI / 180
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2
  return 12742 * Math.asin(Math.sqrt(Math.min(1,h)))
}
export function rangeLabel(trip: Trip, index: number, travel = false) {
  const offset = trip.stops.slice(0,index).reduce((n,s,i)=>n+s.days+trip.legs[i].days,0) + (travel ? trip.stops[index].days : 0)
  const count = travel ? trip.legs[index].days : trip.stops[index].days
  if (!count) return 'Same-day travel'
  const label = (n: number) => {
    if (!trip.absolute || !trip.startDate) return String(n+1)
    const d = new Date(trip.startDate+'T12:00:00Z')
    d.setUTCDate(d.getUTCDate()+n)
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})
  }
  const prefix = trip.absolute && trip.startDate ? '' : 'Day '
  return prefix+label(offset)+(count>1?'–'+label(offset+count-1):'')
}
