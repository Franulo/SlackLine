import { useEffect, useId, useRef, useState } from 'react'
import type { Place } from './model'
import { searchPlaces } from './places'
import { cities, filterCities } from './cities'
import { Brand, Cat, YarnBall } from './art'
import './ticket.css'

type Mode = 'open' | 'loop'
interface TicketProps {
  onCreate(name: string, days: number, mode: Mode, from: Place, to: Place, startDate: string): void
  onTrips(): void
}
const bars = [2,4,1.5,3,2,5,1.5,3,1.5,4,2,3,5,1.5,2,4,2,3,5,1.5,2,3,1.5,4,2,3,5,2,1.5,4,3,1.5,2,4]
function code(place: Place) {
  return cities.find(p => p.name === place.name && Math.abs(p.lat-place.lat)<0.1 && Math.abs(p.lng-place.lng)<0.1)?.code ?? Array.from(place.name).slice(0,3).join('').toLocaleUpperCase()
}

function PlacePicker({label, value, onSelect}: {label: string; value: Place; onSelect(value: Place): void}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<(Place & {description?: string})[]>(cities)
  const [message, setMessage] = useState('')
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])
  useEffect(() => {
    if (!open) return
    const text = query.trim()
    const matches = filterCities(text)
    setRows(matches)
    setMessage('')
    if (text.length < 2) return
    const controller = new AbortController()
    setMessage('Searching…')
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPlaces(text, controller.signal)
        if (controller.signal.aborted) return
        const extra = results.filter(result => !matches.some(city => city.name === result.name && Math.abs(city.lng-result.lng)<0.1 && Math.abs(city.lat-result.lat)<0.1))
        setRows([...matches, ...extra])
        setMessage(results.length || matches.length ? '' : 'No matching places.')
      } catch {
        if (!controller.signal.aborted) setMessage('Place search is unavailable. Try again shortly.')
      }
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, open])

  return <div className="ticket-place" ref={ref} onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus() }
  }}>
    <button type="button" className="ticket-pick" ref={trigger} aria-label={label + ': ' + value.name} aria-controls={open ? id : undefined} aria-expanded={open} onClick={() => {setQuery(''); setOpen(!open)}}>
      <span>{label}</span><strong>{code(value)}</strong><b>{value.name} <svg viewBox="0 0 12 8" width="12" height="8"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg></b>
    </button>
    {open && <div className="ticket-pop" id={id}>
      <input type="search" autoFocus aria-label={'Search ' + label.toLowerCase()} placeholder="Search places worldwide" value={query} onChange={e => setQuery(e.target.value)}/>
      <div aria-live="polite">{message}</div>
      <div className="ticket-results">{rows.map((p,i) => <button key={p.lng + ',' + p.lat + i} type="button" onClick={() => {onSelect(p); setOpen(false); trigger.current?.focus()}}>{p.name}{p.description && <small>{p.description}</small>}</button>)}</div>
    </div>}
  </div>
}
function TicketThread() {
  return <svg className="ticket-thread" viewBox="0 0 268 130" aria-hidden="true">
    <path d="M30 56 Q134 120 238 56" fill="none" stroke="#22302A" strokeWidth="9" strokeLinecap="round"/>
    <path d="M30 56 Q134 120 238 56" fill="none" stroke="#E4572E" strokeWidth="5.5" strokeLinecap="round"/>
    <path d="M30 56 Q134 120 238 56" fill="none" stroke="#FFB59A" strokeWidth="1.8" strokeDasharray="6 6"/>
    <path d="M30 56 V26 M238 56 V26" stroke="#22302A" strokeWidth="2.6"/>
    <path d="M30 26l-20 7 20 7Z" fill="#2F8F6B" stroke="#22302A" strokeWidth="2"/>
    <rect x="238" y="26" width="22" height="14" fill="white" stroke="#22302A" strokeWidth="2"/>
    <path d="M238 26h5.5v7H238z M249 26h5.5v7H249z M243.5 33h5.5v7h-5.5z M254.5 33h5.5v7h-5.5z" fill="#22302A"/>
    <Cat mood="wobbly" x="62" y="12" width="85" height="76" transform="rotate(10 108 78)"/>
  </svg>
}

export function Ticket({onCreate, onTrips}: TicketProps) {
  const [name, setName] = useState('Iberian escape')
  const [days, setDays] = useState(22)
  const [mode, setMode] = useState<Mode>('open')
  const [from, setFrom] = useState<Place>(cities[0])
  const [to, setTo] = useState<Place>(cities[1])
  const [date, setDate] = useState('')
  const duplicate = mode === 'open' && from.lat === to.lat && from.lng === to.lng
  return <main className="ticket-page">
    <header className="ticket-header"><Brand/><button type="button" onClick={onTrips}>← My trips</button></header>
    <div className="ticket-center"><form className="sl-ticket" onSubmit={e => {e.preventDefault(); if (!duplicate && name.trim()) onCreate(name.trim(),days,mode,from,to,date)}}>
      <svg className="ticket-stock" width="100%" height="100%" viewBox="0 0 1007 568" preserveAspectRatio="none" aria-hidden="true">
        <path d="M24 1.25 H702 A18 18 0 0 0 738 1.25 H976 Q998.75 1.25 998.75 24 V536 Q998.75 558.75 976 558.75 H738 A18 18 0 0 0 702 558.75 H24 Q1.25 558.75 1.25 536 V24 Q1.25 1.25 24 1.25 Z" fill="#22302A" transform="translate(6,7)"/>
        <path d="M24 1.25 H702 A18 18 0 0 0 738 1.25 H976 Q998.75 1.25 998.75 24 V536 Q998.75 558.75 976 558.75 H738 A18 18 0 0 0 702 558.75 H24 Q1.25 558.75 1.25 536 V24 Q1.25 1.25 24 1.25 Z" fill="white" stroke="#22302A" strokeWidth="2.5"/>
        <path d="M720 30 V530" stroke="#22302A" strokeWidth="2" strokeDasharray="5 6"/>
      </svg>
      <section className="ticket-main">
        <div><h1>New trip</h1><p>A few details, then make the map your own.</p></div>
        <div className={'ticket-route ' + (mode === 'loop' ? 'is-loop' : '')}>
          {mode === 'open' && <><PlacePicker label="From" value={from} onSelect={setFrom}/><TicketThread/></>}
          <PlacePicker label={mode === 'loop' ? 'Destination' : 'To'} value={to} onSelect={setTo}/>
          {mode === 'loop' && <p>Start with one place. Pull the loop on the map to add the rest of your route.</p>}
        </div>
        <div className="ticket-mode" role="group" aria-label="Route type">{(['open','loop'] as const).map(m => <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'loop' ? 'One destination' : 'Start & end'}</button>)}</div>
        <div className="ticket-fields"><label>Trip name<input value={name} maxLength={80} required onChange={e => setName(e.target.value)}/></label>
          <div><span>Trip length</span><div className="ticket-step"><button type="button" aria-label="Fewer days" disabled={days <= 2} onClick={() => setDays(days-1)}>−</button><div><YarnBall width="32" height="32"/><strong>{days}</strong> days</div><button type="button" aria-label="More days" disabled={days >= 90} onClick={() => setDays(days+1)}>+</button></div></div>
        </div>
        <label className="ticket-date">Start date <input aria-label="Start date" type="date" value={date} onChange={e => setDate(e.target.value)}/><small>Optional</small></label>
      </section>
      <aside className="ticket-stub">
        <div className="ticket-barcode" aria-hidden="true">{bars.map((w,i) => <i key={i} style={{width:w}}/>)}</div>
        <Cat className="ticket-mascot"/>
        <div className="ticket-summary"><span>Ready to plan</span><strong>{days} days</strong><b>{mode === 'loop' ? code(to) + ' and beyond' : code(from) + ' → ' + code(to)}</b></div>
        {duplicate && <p role="alert">Pick two different places.</p>}
        <button className="ticket-go" disabled={duplicate || !name.trim()}>Start trip <span aria-hidden="true">→</span></button>
      </aside>
    </form></div>
    <details className="ticket-credits"><summary>Data credits</summary>City search uses <a href="https://www.geonames.org/">GeoNames</a> data via <a href="https://open-meteo.com/">Open-Meteo</a>.</details>
  </main>
}
export default Ticket
