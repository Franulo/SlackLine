import {useRef,useState} from 'react'
import type {KeyboardEvent,PointerEvent} from 'react'
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
type PostcardHandle='move'|'resize'
const arrowOffsets:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}
function noteLinks(note:string){
  return Array.from(note.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"`]+/gi),match=>{
    let text=match[0].replace(/[.,!?;:]+$/,'')
    while(text.endsWith(')')&&(text.match(/\)/g)?.length??0)>(text.match(/\(/g)?.length??0))text=text.slice(0,-1)
    return {text,start:match.index,href:/^https?:\/\//i.test(text)?text:'https://'+text}
  })
}

function PostcardNotes({text,placeholder,save}:{text:string;placeholder:string;save:(text:string)=>void}){
  const [editing,setEditing]=useState(false)
  const links=editing?[]:noteLinks(text)
  if(!links.length)return <label className="editor-notes">Notes
    <textarea value={text} placeholder={placeholder} autoFocus={editing}
      onFocus={()=>setEditing(true)} onBlur={()=>setEditing(false)} onChange={e=>save(e.target.value)}/>
  </label>

  const last=links.at(-1)!
  return <div className="editor-notes">
    <div className="editor-notes-heading">
      <strong>Notes</strong>
      <button type="button" onClick={()=>setEditing(true)}>Edit notes</button>
    </div>
    <div className="editor-note-text">
      {links.map(({text:label,start,href},index)=>{
        const previous=links[index-1]
        return <span key={start}>{text.slice(previous?previous.start+previous.text.length:0,start)}
          <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
        </span>
      })}
      {text.slice(last.start+last.text.length)}
    </div>
  </div>
}

function Postcard({trip,selection,close,save}:{trip:Trip;selection:Selection;close:()=>void;save:(t:Trip)=>void}){
  const [daysDraft,setDaysDraft]=useState<string|null>(null)
  const panel=useRef<HTMLElement>(null)
  const gesture=useRef<{kind:PostcardHandle;pointerId:number;x:number;y:number;box:ReturnType<typeof measure>}|null>(null)
  function measure(){
    const el=panel.current!
    return {left:el.offsetLeft,top:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight}
  }
  function adjust(kind:PostcardHandle,box:ReturnType<typeof measure>,dx:number,dy:number){
    const el=panel.current!
    if(kind==='move'){
      el.style.setProperty('--postcard-left',`${box.left+dx}px`)
      el.style.setProperty('--postcard-top',`${box.top+dy}px`)
    }else{
      const parent=el.parentElement!
      const width=Math.min(parent.clientWidth-box.left-8,Math.max(250,box.width+dx))
      const height=Math.min(parent.clientHeight-box.top-8,Math.max(220,box.height+dy))
      el.style.setProperty('--postcard-width',`${width}px`)
      el.style.setProperty('--postcard-height',`${height}px`)
    }
  }
  function start(e:PointerEvent<HTMLElement>,kind:PostcardHandle){
    if(e.button!==0||gesture.current)return
    gesture.current={kind,pointerId:e.pointerId,x:e.clientX,y:e.clientY,box:measure()}
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function track(e:PointerEvent<HTMLElement>){
    const active=gesture.current
    if(active?.pointerId===e.pointerId)adjust(active.kind,active.box,e.clientX-active.x,e.clientY-active.y)
  }
  function finish(e:PointerEvent<HTMLElement>){
    if(gesture.current?.pointerId===e.pointerId)gesture.current=null
  }
  function nudge(e:KeyboardEvent<HTMLElement>,kind:PostcardHandle){
    const offset=arrowOffsets[e.key]
    if(!offset)return
    e.preventDefault()
    const step=e.shiftKey?48:16
    adjust(kind,measure(),offset[0]*step,offset[1]*step)
  }
  const {kind,index}=selection, item=trip[kind][index], stop=trip.stops[index], next=trip.stops[(index+1)%trip.stops.length], travel=kind==='legs'
  if(!item)return null
  const minDays=0
  const maxDays=item.days+Math.max(0,remaining(trip))
  function saveDays(days:number){
    if(!Number.isFinite(days))return
    const updated=allocate(trip,kind,index,days)
    if(updated[kind][index].days!==item.days)save(updated)
  }
  function note(value:string){save({...trip,[kind]:trip[kind].map((s,i)=>i===index?{...s,note:value}:s)})}
  return <section ref={panel} className="panel editor" aria-label="Route postcard" onPointerMove={track} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
    <header className="editor-header" onPointerDown={e=>start(e,'move')}>
      <div className="editor-title" tabIndex={0} title="Drag to move postcard, or use the arrow keys" onKeyDown={e=>nudge(e,'move')}>
        <small>{travel?'Travel postcard':'Stay postcard'}</small><h2>{travel?stop.name+' → '+next.name:stop.name}</h2>
      </div>
      <button type="button" aria-label="Close postcard" onPointerDown={e=>e.stopPropagation()} onClick={close}><CloseIcon/></button>
    </header>
    <div className="editor-body">
    <p>{rangeLabel(trip,index,travel)}{travel?' · '+Math.round(distance(stop,next)).toLocaleString()+' km':''}</p>
    <label>{travel?'Overnight travel (nights)':'Number of stays'}<input type="number" min={minDays} max={maxDays} step={1}
      aria-describedby={travel?'overnight-travel-help':undefined}
      value={daysDraft??item.days}
      onChange={e=>{
        const {value,valueAsNumber}=e.currentTarget
        setDaysDraft(value)
        if(Number.isInteger(valueAsNumber)&&valueAsNumber>=minDays&&valueAsNumber<=maxDays)saveDays(valueAsNumber)
      }}
      onBlur={e=>{saveDays(e.currentTarget.valueAsNumber);setDaysDraft(null)}}
      onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}
    /></label>
    {travel&&<small id="overnight-travel-help">Use 0 for same-day travel or 1 for a night on a train.</small>}
    <PostcardNotes text={item.note} placeholder={travel?'Train times, tickets, or a reminder…':'Bookings, links, or a reminder…'} save={note}/>
    {!travel&&index>0&&index<trip.legs.length&&<button onClick={()=>{save(removeStop(trip,index));close()}}>Remove stop</button>}
    </div>
    <footer className="editor-footer">
      <button type="button" className="editor-resize" aria-label="Resize postcard with arrow keys" title="Drag to resize postcard" onPointerDown={e=>start(e,'resize')} onKeyDown={e=>nudge(e,'resize')}>◢</button>
    </footer>
  </section>
}
function TripList({trips,open,remove,reorder}:{trips:Trip[];open:(trip:Trip)=>void;remove:(trip:Trip)=>void;reorder:(id:string,to:number)=>void}){
  const list=useRef<HTMLDivElement>(null)
  const drag=useRef<{pointerId:number;id:string;from:number;to:number;grabY:number;rows:HTMLElement[]}|null>(null)
  function start(e:PointerEvent<HTMLButtonElement>,id:string,from:number){
    if(e.button!==0||drag.current||trips.length<2)return
    const rows=Array.from(list.current!.querySelectorAll<HTMLElement>('.trip-row'))
    drag.current={pointerId:e.pointerId,id,from,to:from,grabY:e.clientY-rows[from].getBoundingClientRect().top,rows}
    rows[from].setAttribute('data-dragging','')
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function track(e:PointerEvent<HTMLDivElement>){
    const active=drag.current
    if(active?.pointerId!==e.pointerId)return
    const {rows,from,grabY}=active
    const row=rows[from], container=list.current!
    const max=container.clientHeight-row.offsetHeight
    const top=Math.max(0,Math.min(max,e.clientY-container.getBoundingClientRect().top-grabY))
    const center=top+row.offsetHeight/2
    const before=rows.findIndex((other,i)=>i!==from&&center<other.offsetTop+other.offsetHeight/2)
    const to=top===0?0:top===max?rows.length-1:before===-1?rows.length-1:before>from?before-1:before
    const gap=rows[1].offsetTop-rows[0].offsetTop-rows[0].offsetHeight
    const shift=row.offsetHeight+gap
    rows.forEach((other,i)=>{
      const y=i===from?top-row.offsetTop:i>from&&i<=to?-shift:i>=to&&i<from?shift:0
      other.style.transform=y?`translateY(${y}px)`:''
    })
    active.to=to
  }
  function finish(e:PointerEvent<HTMLDivElement>,drop:boolean){
    const active=drag.current
    if(active?.pointerId!==e.pointerId)return
    if(drop)track(e)
    drag.current=null
    active.rows[active.from].removeAttribute('data-dragging')
    active.rows.forEach(row=>{row.style.transform=''})
    if(drop&&active.from!==active.to)reorder(active.id,active.to)
  }
  return <div ref={list} className="trip-list" onPointerMove={track} onPointerUp={e=>finish(e,true)}
    onPointerCancel={e=>finish(e,false)} onLostPointerCapture={e=>finish(e,false)}>
    {trips.map((t,index)=><div className="trip-row" key={t.id}>
      <button type="button" className="trip-grip" aria-label={`Reorder ${t.name}`} title="Drag or use the up and down arrow keys"
        disabled={trips.length<2} onPointerDown={e=>start(e,t.id,index)} onKeyDown={e=>{
          if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return
          e.preventDefault()
          reorder(t.id,index+(e.key==='ArrowUp'?-1:1))
        }}>
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
          {[5,10,15].map(y=><g key={y}><circle cx="7" cy={y} r="1.4"/><circle cx="13" cy={y} r="1.4"/></g>)}
        </svg>
      </button>
      <button type="button" className="trip-open" onClick={()=>open(t)}>
        <YarnBall width="52" height="52"/>
        <span><strong>{t.name}</strong><small>{t.stops[0].name} {t.mode==='loop'?'· Round trip':'→ '+t.stops.at(-1)?.name}</small></span>
        <b>{t.total} {t.total===1?'day':'days'}</b>
      </button>
      <button type="button" className="trip-delete" aria-label={`Delete ${t.name}`} title="Delete trip" onClick={()=>remove(t)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/>
        </svg>
      </button>
    </div>)}
  </div>
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
  function deleteTrip(t:Trip){
    if(!window.confirm(`Delete "${t.name}"?`))return
    store({active:library.active===t.id?null:library.active,trips:library.trips.filter(item=>item.id!==t.id)})
  }
  function reorderTrip(id:string,to:number){
    const from=library.trips.findIndex(t=>t.id===id)
    if(from<0||to===from||to<0||to>=library.trips.length)return
    const trips=[...library.trips]
    const [moved]=trips.splice(from,1)
    trips.splice(to,0,moved)
    store({...library,trips})
  }
  function open(t:Trip){save(t);select(null);setPlaceCard(null);setDateOpen(false);setPreview(null);setNotes(false);setPage('planner')}
  function selectPlace(place:SuggestedPlace|null){
    setPlaceCard(place)
    if(place){select(null);setDateOpen(false)}
  }
  const live=preview??trip
  return <>{page==='ticket'?<Ticket onTrips={()=>setPage('trips')} onCreate={(...args)=>open(createTrip(...args))}/>:
    page==='trips'?<main className="library"><header><Brand/><button onClick={()=>setPage('ticket')}>New trip</button></header><section><h1>My trips</h1>
    {library.trips.length===0?<p>Your saved trips will appear here.</p>:<TripList trips={library.trips} open={open} remove={deleteTrip} reorder={reorderTrip}/>}</section></main>:
    trip&&live&&<main className="planner">
      <RouteMap key={trip.id} trip={trip} notes={notes} preview={setPreview} commit={t=>{save(t);select(null);setPlaceCard(null)}} select={s=>{select(s);setDateOpen(false);setPlaceCard(null)}} placeCard={placeCard} selectPlace={selectPlace}/>
      <Chrome name={trip.name} total={live.total} remaining={remaining(live)} routeLabel={trip.stops.map(s=>s.name).join(' → ')+(trip.mode==='loop'?' ↺':'')} notes={notes} onName={name=>save({...trip,name})} onTrips={()=>setPage('trips')} onTotal={total=>save({...trip,total})} onNotes={()=>{setNotes(!notes);select(null)}}
        placeCard={placeCard&&<PlaceCard key={placeCard.sourceUrl} place={placeCard} close={()=>setPlaceCard(null)}/>} onShowTips={()=>setPlaceCard(null)}/>
      <div className="date-controls"><button aria-expanded={dateOpen} onClick={()=>{setDateOpen(!dateOpen);select(null);setPlaceCard(null)}}>{trip.absolute?'Calendar dates':'Relative days'} ▾</button>
      {dateOpen&&<div className="panel"><label>Trip start<input type="date" value={trip.startDate} onChange={e=>save({...trip,startDate:e.target.value,absolute:!!e.target.value&&trip.absolute})}/></label>
      <label><input type="checkbox" disabled={!trip.startDate} checked={trip.absolute} onChange={e=>save({...trip,absolute:e.target.checked})}/> Show calendar dates</label>
      <ol className="date-list">{trip.stops.map((s,i)=><li key={s.id}>{s.name} · {rangeLabel(trip,i)}{trip.legs[i]?.days>0&&<small>Travel · {rangeLabel(trip,i,true)}</small>}</li>)}</ol></div>}</div>
      {selected&&<Postcard key={trip[selected.kind][selected.index]?.id} trip={trip} selection={selected} save={save} close={()=>select(null)}/>}</main>}
    {error&&<output className="map-message">{error}</output>}</>
}
createRoot(document.getElementById('root')!).render(location.pathname.startsWith('/demo')?<CourseDemo/>:<App/>)
