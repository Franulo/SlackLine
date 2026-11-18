import {useEffect,useRef,useState} from 'react'
import type {PointerEvent as ReactPointer} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {allocate,distance,insert,remaining} from './model'
import type {Trip,Place} from './model'
import {suggestPlaces} from './places'
import {YarnBall,Cat} from './art'

type Point = {x:number;y:number}
type Drag = {kind:'pull'|'move'|'size';index:number;origin:Point;base:Trip;draft:Trip;started:boolean;radius:number}
type Selection = {kind:'stops'|'legs'; index:number}
type Props = {trip:Trip; notes:boolean; commit:(trip:Trip)=>void; preview:(trip:Trip|null)=>void; select:(s:Selection)=>void}
const radius = (days:number)=>15+3.8*Math.sqrt(days)*Math.sqrt(Math.min(6,days))
const km = (a:Place,b:Place)=>Math.round(distance(a,b)).toLocaleString()+' km'
const mid = (a:Point,b:Point)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
function curve(a:Point,b:Point,sag:number,loop:boolean,single:boolean) {
  if(single){
    const width = 58+sag*30, height = 55+sag*76
    return {path:`M ${a.x} ${a.y} c ${-width*2} ${height*1.4} ${width*2} ${height*1.4} 0 0`,center:{x:a.x,y:a.y+height*1.05}}
  }
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1
  const direction=loop ? 1 : dx>=0 ? 1 : -1
  const bend= Math.min(200,len*.42)*sag
  const m=mid(a,b), c={x:m.x-direction*dy/len*bend,y:m.y+direction*dx/len*bend}
  return {path:`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`,center:mid(m,c)}
}
export function RouteMap(props:Props){
  const host=useRef<HTMLDivElement>(null), svg=useRef<SVGSVGElement>(null), map=useRef<maplibregl.Map|null>(null)
  const current=useRef(props); current.current=props
  const drag=useRef<Drag|null>(null)
  const [,redraw]=useState(0), [message,setMessage]=useState(''), [hint,setHint]=useState('')
  const [places,setPlaces]=useState<Awaited<ReturnType<typeof suggestPlaces>>>([])
  const [placeCard,setPlaceCard]=useState<(typeof places)[number]|null>(null)
  const [camera,setCamera]=useState(0)
  useEffect(()=>{
    const first=current.current.trip
    let engine:maplibregl.Map
    try{
      const key=import.meta.env.VITE_MAPTILER_KEY
      engine=new maplibregl.Map({container:host.current!, style:key?'https://api.maptiler.com/maps/streets-v2/style.json?key='+encodeURIComponent(key):'https://tiles.openfreemap.org/styles/positron', center:[first.stops[0].lng,first.stops[0].lat],zoom:7,attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false})
    }catch{setMessage('The map needs WebGL. Enable graphics acceleration and reload.');return}
    map.current=engine
    const bounds=new maplibregl.LngLatBounds()
    first.stops.forEach(s=>bounds.extend([s.lng,s.lat]))
    if(first.stops.length>1) engine.fitBounds(bounds,{padding:{left:64,right:Math.min(330,innerWidth*.27),top:140,bottom:100},duration:0,maxZoom:9})
    engine.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-left')
    engine.on('move',()=>redraw(v=>v+1))
    engine.on('resize',()=>redraw(v=>v+1))
    engine.on('moveend',()=>setCamera(v=>v+1))
    engine.on('load',()=>{setMessage('');setCamera(v=>v+1)})
    engine.on('error',()=>{if(!engine.isStyleLoaded())setMessage('Map tiles are unavailable. Check your connection.')})
    engine.on('click',e=>{
      const {trip,commit}=current.current
      const place={name:'Map stop',lng:e.lngLat.wrap().lng,lat:e.lngLat.lat}
      if(remaining(trip)<=0){setMessage('Trip is full. Shorten a stay or add a day.');return}
      const paths=Array.from(svg.current?.querySelectorAll<SVGPathElement>('path[data-leg]')??[])
      let nearest=0,best=Infinity
      paths.forEach((path,index)=>{
        const length=path.getTotalLength()
        for(let i=0;i<=24;i++){const p=path.getPointAtLength(length*i/24),d=Math.hypot(e.point.x-p.x,e.point.y-p.y);if(d<best){best=d;nearest=index}}
      })
      commit(insert(trip,nearest,place));setPlaceCard(null)
    })
    redraw(v=>v+1);setCamera(v=>v+1)
    return ()=>{map.current=null;engine.remove()}
  },[])
  useEffect(()=>{
    if(!map.current)return
    const controller=new AbortController(), engine=map.current
    const timer=setTimeout(async()=>{
      const b=engine.getBounds()
      if(engine.getZoom()<4){setPlaces([]);return}
      try{const result=await suggestPlaces({west:b.getWest(),east:b.getEast(),north:b.getNorth(),south:b.getSouth()},controller.signal)
        if(!controller.signal.aborted)setPlaces(result)
      }catch{if(!controller.signal.aborted)setPlaces([])}
    },250)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[camera])
  useEffect(()=>{if(message){const t=setTimeout(()=>setMessage(''),6000);return ()=>clearTimeout(t)}},[message])
  const engine=map.current, trip=drag.current?.draft??props.trip
  const points=engine?trip.stops.map(s=>engine.project([s.lng,s.lat])):[]
  const slack=remaining(trip), ratio=slack/trip.total
  const legs=points.length?trip.legs.map((_,i)=>curve(points[i],points[(i+1)%points.length],ratio,trip.mode==='loop',points.length===1)):[]
  function point(e:ReactPointer){const box=svg.current!.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top}}
  function begin(e:ReactPointer,kind:Drag['kind'],index:number){
    if(e.button!==0||drag.current)return
    e.preventDefault(); e.stopPropagation()
    const origin=point(e)
    const p=points[index]
    drag.current={kind,index,origin,base:props.trip,draft:props.trip,started:false,radius:p?Math.hypot(origin.x-p.x,origin.y-p.y):0}
    svg.current!.setPointerCapture(e.pointerId)
    setPlaceCard(null)
  }
  function move(e:ReactPointer){
    const d=drag.current
    if(!engine||!d)return
    const p=point(e), {base,index}=d
    if(!d.started && Math.hypot(p.x-d.origin.x,p.y-d.origin.y)<4)return
    d.started=true
    if(d.kind==='pull'&&remaining(base)===0){setMessage('Trip is full. Shorten a stay or add a day.');return}
    const ll=engine.unproject([p.x,p.y]).wrap()
    let place:Place={lng:ll.lng,lat:ll.lat,name:'Map stop'}
    let best=26
    for(const item of places){const q=engine.project([item.lng,item.lat]),dist=Math.hypot(q.x-p.x,q.y-p.y)
      if(dist<best){place=item;best=dist}}
    if(d.kind==='pull'){
      if(d.draft===base)d.draft=insert(base,index,place)
      d.draft={...d.draft,stops:d.draft.stops.map((s,i)=>i===index+1?{...s,...place}:s)}
      const next=base.stops[(index+1)%base.stops.length]
      setHint(base.stops.length===1?km(base.stops[0],place)+' each way':km(base.stops[index],place)+' · '+km(place,next))
    }else if(d.kind==='move'){
      d.draft={...base,stops:base.stops.map((s,i)=>i===index?{...s,...place,name:best<26?place.name:'Map stop'}:s)}
    }else {
      const old=base.stops[index], center=engine.project([old.lng,old.lat])
      const delta=Math.hypot(p.x-center.x,p.y-center.y)-d.radius
      d.draft=allocate(base,'stops',index,old.days+Math.round(delta/4))
    }
    props.preview(d.draft);redraw(v=>v+1)
  }
  function end(cancel:boolean){
    const d=drag.current;if(!d)return
    drag.current=null;props.preview(null);setHint('')
    if(!cancel){
      if(d.started&&d.draft!==d.base)props.commit(d.draft)
      else if(!d.started)props.select({kind:d.kind==='pull'?'legs':'stops',index:d.index})
    }
    redraw(v=>v+1)
  }
  const c=slack?'#e4572e':'#2f8f6b'
  return <><div className="basemap" ref={host}/><svg ref={svg} className="route-overlay" aria-label="Trip yarn and stops" onPointerMove={move} onPointerUp={()=>end(false)} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(true)}>
    {engine&&places.map((s,i)=>{const p=engine.project([s.lng,s.lat]);return <g className="place-pin" key={i} transform={`translate(${p.x},${p.y})`} onClick={()=>setPlaceCard(s)}><title>{s.name}</title><circle r="8"/><text x="12" y="4">{s.name}</text></g>})}
    {legs.map(({path,center},i)=><g key={trip.legs[i].id}>
      <path d={path} stroke="#22302a" strokeWidth="8"/><path d={path} stroke={c} strokeWidth="5.5"/><path d={path} stroke="#ffd9bd" strokeWidth="1.8" strokeDasharray="5 5"/>
      <path data-leg={i} className="grab-leg" d={path} onPointerDown={e=>begin(e,'pull',i)}/>
      {props.notes&&<g className="map-tag" onClick={()=>props.select({kind:'legs',index:i})} transform={`translate(${center.x},${center.y+15})`}><rect x="-22" y="-10" width="44" height="22" rx="5"/><text textAnchor="middle" y="5">✉ {trip.legs[i].days}d</text></g>}
    </g>)}
    {legs.length>0&&<Cat x={legs[0].center.x-20} y={legs[0].center.y-41} width="40" height="44" mood={slack?'wobbly':'celebrate'}/>}
    {points.map((p,i)=>{const s=trip.stops[i],r=radius(s.days);return <g key={s.id} transform={`translate(${p.x},${p.y})`}>
      <YarnBall x={-r} y={-r} width={2*r} height={2*r} green={!slack}/>
      <circle className="stop-center" r={Math.max(9,r-5)} onPointerDown={e=>begin(e,'move',i)}><title>{s.name} · Drag to move or click for details</title></circle>
      <circle className="stop-edge" r={r} onPointerDown={e=>begin(e,'size',i)}><title>Drag edge to resize stay</title></circle>
      <text className="map-label" textAnchor="middle" y={r+18}>{s.name} · {s.days}d</text>
      {props.notes&&<g className="map-tag" transform={`translate(${r},${-r})`} onClick={()=>props.select({kind:'stops',index:i})}><rect width="25" height="20" rx="4"/><text x="5" y="15">✉</text></g>}
    </g>})}
  </svg>
  {placeCard&&<aside className="place-card panel"><button aria-label="Close place information" onClick={()=>setPlaceCard(null)}>×</button><strong>{placeCard.name}</strong><p>{placeCard.description}</p><small>{placeCard.popularity} · <a href={placeCard.sourceUrl} target="_blank" rel="noreferrer">Wikipedia</a></small></aside>}
  {(hint||message)&&<output className="map-message">{hint||message}</output>}</>
}

