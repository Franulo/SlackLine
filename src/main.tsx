import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Ticket} from './Ticket'
import {Brand,YarnBall} from './art'
import {Chrome,CloseIcon,NotesIcon,PencilIcon} from './Chrome'
import {PlaceCard,RouteMap} from './RouteMap'
import type {SuggestedPlace} from './places'
import {allocate,createTrip,distance,rangeLabel,remaining,removeStop} from './model'
import type {Trip} from './model'
import './style.css'

type Library={active:string|null; trips:Trip[]}
const key='slackline.library.v1'
function readLibrary():Library{
  try{
    const data=JSON.parse(localStorage.getItem(key)??'null')
    if(data && Array.isArray(data.trips))return data
  }catch{/* An unavailable store still allows a session in memory. */}
  return {active:null,trips:[]}
}
function CourseDemo(){
  const styles=location.pathname.endsWith('styles')
  return <main className="course"><Brand/><h1>{styles?'Hello styles':'Hello world'}</h1>
    {styles&&<><h2>Colors</h2><div className="swatches">{['#22302A','#E4572E','#FFC93C','#2F8F6B','#D7385E'].map(c=><div key={c}><div style={{background:c,height:56}}/>{c}</div>)}</div>
    <h2>Typefaces</h2><p style={{fontFamily:'Fraunces',fontWeight:700}}>Fraunces bold</p><p style={{fontFamily:'Fraunces',fontStyle:'italic'}}>Fraunces italic</p>{[400,500,700].map((w,i)=><p key={w} style={{fontWeight:w}}>Figtree {['regular','medium','bold'][i]}</p>)}<h2>Icons</h2><div className="icons"><PencilIcon/><NotesIcon/><CloseIcon/><Brand/><YarnBall width="32" height="32"/></div></>}
    <nav><a href="/demo/styles">Hello Styles</a> · <a href="/">Trip planner</a></nav></main>
}
type Selection={kind:'legs'|'stops';index:number}
function Postcard({trip,selection,close,save}:{trip:Trip;selection:Selection;close:()=>void;save:(t:Trip)=>void}){
  const {kind,index}=selection, item=trip[kind][index], stop=trip.stops[index], next=trip.stops[(index+1)%trip.stops.length], travel=kind==='legs'
  if(!item)return null
  function note(value:string){save({...trip,[kind]:trip[kind].map((s,i)=>i===index?{...s,note:value}:s)})}
  return <section className="panel editor" aria-label="Route postcard">
    <button className="dismiss" aria-label="Close postcard" onClick={close}><CloseIcon/></button>
    <small>{travel?'Travel postcard':'Stay postcard'}</small><h2>{travel?stop.name+' → '+next.name:stop.name}</h2>
    <p>{rangeLabel(trip,index,travel)}{travel?' · '+Math.round(distance(stop,next)).toLocaleString()+' km':''}</p>
    <label>{travel?'Travel days':'Stay days'}<input type="number" min={travel?0:1} max={item.days+remaining(trip)} value={item.days} onChange={e=>save(allocate(trip,kind,index,e.target.valueAsNumber))}/></label>
    <label>Notes<textarea value={item.note} placeholder={travel?'Train times, tickets, or a reminder…':'Bookings, links, or a reminder…'} onChange={e=>note(e.target.value)}/></label>
    {!travel&&index>0&&index<trip.legs.length&&<button onClick={()=>{save(removeStop(trip,index));close()}}>Remove stop</button>}
  </section>
}
function App(){
  const [library,setLibrary]=useState(readLibrary)
  const trip=library.trips.find(t=>t.id===library.active)
  const [page,setPage]=useState<'ticket'|'planner'|'trips'>('trips')
  const [preview,setPreview]=useState<Trip|null>(null),[notes,setNotes]=useState(false)
  const [selected,select]=useState<Selection|null>(null),[dateOpen,setDateOpen]=useState(false),[error,setError]=useState('')
  const [placeCard,setPlaceCard]=useState<SuggestedPlace|null>(null)
  function store(data:Library){
    setLibrary(data)
    try{localStorage.setItem(key,JSON.stringify(data));setError('')}
    catch{setError('Browser storage is unavailable. This session’s changes are held in memory.')}
  }
  function save(t:Trip){
    const exists=library.trips.some(item=>item.id===t.id)
    store({active:t.id,trips:exists?library.trips.map(item=>item.id===t.id?t:item):[t,...library.trips]})
  }
  function open(t:Trip){save(t);select(null);setPlaceCard(null);setDateOpen(false);setPreview(null);setNotes(false);setPage('planner')}
  function selectPlace(place:SuggestedPlace|null){
    setPlaceCard(place)
    if(place){select(null);setDateOpen(false)}
  }
  const live=preview??trip
  return <>{page==='ticket'?<Ticket onTrips={()=>setPage('trips')} onCreate={(...args)=>open(createTrip(...args))}/>:
    page==='trips'?<main className="library"><header><Brand/><button onClick={()=>setPage('ticket')}>New trip</button></header><section><h1>My trips</h1>
    {library.trips.length===0?<p>Your saved trips will appear here.</p>:<div className="trip-list">{library.trips.map(t=><button key={t.id} onClick={()=>open(t)}><YarnBall width="52" height="52"/><span><strong>{t.name}</strong><small>{t.stops[0].name} {t.mode==='loop'?'· Round trip':'→ '+t.stops.at(-1)?.name}</small></span><b>{t.total} days</b></button>)}</div>}</section></main>:
    trip&&live&&<main className="planner">
      <RouteMap key={trip.id} trip={trip} notes={notes} preview={setPreview} commit={t=>{save(t);select(null);setPlaceCard(null)}} select={s=>{select(s);setDateOpen(false);setPlaceCard(null)}} placeCard={placeCard} selectPlace={selectPlace}/>
      <Chrome name={trip.name} total={live.total} remaining={remaining(live)} routeLabel={trip.stops.map(s=>s.name).join(' → ')+(trip.mode==='loop'?' ↺':'')} notes={notes} onName={name=>save({...trip,name})} onTrips={()=>setPage('trips')} onTotal={total=>save({...trip,total})} onNotes={()=>{setNotes(!notes);select(null)}}
        placeCard={placeCard&&<PlaceCard key={placeCard.sourceUrl} place={placeCard} close={()=>setPlaceCard(null)}/>} onShowTips={()=>setPlaceCard(null)}/>
      <div className="date-controls"><button aria-expanded={dateOpen} onClick={()=>{setDateOpen(!dateOpen);select(null);setPlaceCard(null)}}>{trip.absolute?'Calendar dates':'Relative days'} ▾</button>
      {dateOpen&&<div className="panel"><label>Trip start<input type="date" value={trip.startDate} onChange={e=>save({...trip,startDate:e.target.value,absolute:!!e.target.value&&trip.absolute})}/></label>
      <label><input type="checkbox" disabled={!trip.startDate} checked={trip.absolute} onChange={e=>save({...trip,absolute:e.target.checked})}/> Show calendar dates</label>
      <ol className="date-list">{trip.stops.map((s,i)=><li key={s.id}>{s.name} · {rangeLabel(trip,i)}{trip.legs[i]?.days>0&&<small>Travel · {rangeLabel(trip,i,true)}</small>}</li>)}</ol></div>}</div>
      {selected&&<Postcard trip={trip} selection={selected} save={save} close={()=>select(null)}/>}</main>}
    {error&&<output className="map-message">{error}</output>}</>
}
createRoot(document.getElementById('root')!).render(location.pathname.startsWith('/demo')?<CourseDemo/>:<App/>)
