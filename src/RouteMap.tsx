import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import type {PointerEvent as ReactPointer} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {allocate,distance,insert,remaining,stayBudget} from './model'
import type {Trip,Place} from './model'
import {findCityArticle,loadPlacePreview,suggestPlaces} from './places'
import type {SuggestedPlace} from './places'
import {CloseIcon} from './Chrome'
import {loadTravelGuide} from './travelGuide'
import {YarnBall,Cat} from './art'
import {cities} from './cities'

type Point = {x:number;y:number}
type Drag = {kind:'pull'|'move'|'size';index:number;origin:Point;base:Trip;draft:Trip;started:boolean;radius:number}
type Selection = {kind:'stops'|'legs'; index:number}
type Props = {trip:Trip; notes:boolean; commit:(trip:Trip)=>void; preview:(trip:Trip|null)=>void; select:(s:Selection)=>void; placeCard:SuggestedPlace|null; selectPlace:(place:SuggestedPlace|null)=>void}
const radius = (days:number)=>15+3.8*Math.sqrt(days)*Math.sqrt(Math.min(6,days))
const ballScale = (zoom:number)=>Math.max(.28,Math.min(1,2**((zoom-7)/2.5)))
const nearbyLongitude = (lng:number,reference:number)=>lng+360*Math.round((reference-lng)/360)
const localPlaces:SuggestedPlace[]=cities.map(({name,description,lng,lat})=>({
  name,description,lng,lat,kind:'city',importance:0,popularity:'',
  sourceUrl:'https://en.wikipedia.org/w/index.php?search='+encodeURIComponent(name+' '+description),
}))
const translate = (p:Point)=>`translate(${p.x},${p.y})`
function projectStops(engine:maplibregl.Map,trip:Trip,centerLng=engine.getCenter().lng){
  let routeLng=centerLng
  return trip.stops.map(s=>{
    routeLng=nearbyLongitude(s.lng,routeLng)
    return engine.project([routeLng,s.lat])
  })
}
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
// Warm, muted palette so the red yarn stays the loudest thing on the map.
const palette:[string,string,string][]=[
  ['background','background-color','#f3ecdc'],['water','fill-color','#a9d3d6'],
  ['waterway_river','line-color','#8fc4c9'],['waterway_other','line-color','#8fc4c9'],
  ['park','fill-color','#cfe3b4'],['landcover_wood','fill-color','#b9d79a'],['landcover_grass','fill-color','#d6e6b6'],
  ['landcover_sand','fill-color','#f1e2b0'],['landcover_ice','fill-color','#e8f1f0'],['landcover_wetland','fill-color','#c4dcc0'],
  ['landuse_residential','fill-color','#ead9bd'],['building','fill-color','#dcc9aa'],['building-3d','fill-extrusion-color','#dcc9aa'],
  ['road_motorway','line-color','#e4572e'],['road_trunk_primary','line-color','#ffc93c'],['road_secondary_tertiary','line-color','#fff2c4'],
  ['road_minor','line-color','#fffaf0'],['road_motorway_casing','line-color','#b8431f'],
  ['boundary_2','line-color','#7a6a57'],['water_name_point_label','text-color','#2f6f78'],['water_name_line_label','text-color','#2f6f78']
]
const clutter=['poi_r20','poi_r7','poi_r1','poi_transit','road_one_way_arrow','road_one_way_arrow_opposite']
function paintMap(m:maplibregl.Map){
  for(const [id,prop,value] of palette){try{if(m.getLayer(id))m.setPaintProperty(id,prop as never,value)}catch{}}
  if(!new URLSearchParams(location.search).has('nohill')&&!m.getSource('relief')){
    try{
      m.addSource('relief',{type:'raster-dem',encoding:'terrarium',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:12,attribution:'Terrain: Mapzen, AWS Terrain Tiles'})
      m.addLayer({id:'relief-shade',type:'hillshade',source:'relief',maxzoom:12,paint:{'hillshade-exaggeration':.35,'hillshade-shadow-color':'#7a5a3c','hillshade-highlight-color':'#fff6df','hillshade-accent-color':'#a98a63','hillshade-illumination-direction':335}},m.getLayer('waterway_tunnel')?'waterway_tunnel':undefined)
    }catch{}
  }
  for(const id of clutter){try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility','none')}catch{}}
}
function addCityDots(m:maplibregl.Map){
  const layers=m.getStyle().layers.filter(layer=>layer.type==='symbol'&&
    /(?:^|[-_])(city|town)(?:$|[-_])/i.test(layer.id)&&layer.layout?.['text-field'])
  if(!layers.length)return []

  const image='slackline-city-dot'
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=18
  const ctx=canvas.getContext('2d')
  if(!ctx)return []
  ctx.beginPath()
  ctx.arc(9,9,6.5,0,Math.PI*2)
  ctx.fillStyle='#ffc93c'
  ctx.fill()
  ctx.lineWidth=2
  ctx.strokeStyle='#22302a'
  ctx.stroke()
  m.addImage(image,ctx.getImageData(0,0,18,18),{pixelRatio:2})

  return layers.map(({id})=>{
    // The dot and name share a symbol and use the same zoom and collision rules.
    m.setLayoutProperty(id,'icon-image',image)
    m.setLayoutProperty(id,'icon-size',1)
    m.setLayoutProperty(id,'icon-allow-overlap',true)
    m.setLayoutProperty(id,'icon-optional',false)
    m.setLayoutProperty(id,'text-optional',false)
    m.setLayoutProperty(id,'text-anchor','bottom')
    m.setLayoutProperty(id,'text-offset',[0,-.35])
    return id
  })
}
function cityNear(m:maplibregl.Map,layers:string[],point:Point,lngReference:number,reach:number){
  if(!layers.length)return
  const {x,y}=point
  const features=m.queryRenderedFeatures([[x-reach,y-reach],[x+reach,y+reach]],{layers})
  let closest:SuggestedPlace|undefined
  for(const feature of features){
    if(feature.geometry.type!=='Point')continue
    const [lng,lat]=feature.geometry.coordinates
    const p=m.project([nearbyLongitude(lng,lngReference),lat])
    const distance=Math.hypot(x-p.x,y-p.y)
    const name=feature.properties.name_en??feature.properties['name:en']??feature.properties.name
    if(distance>=reach||typeof name!=='string'||!name)continue
    reach=distance
    closest={
      name,lng,lat,kind:'city',importance:0,popularity:'',
      description:feature.properties.class==='town'?'Town':'City',
      sourceUrl:'https://en.wikipedia.org/w/index.php?search='+encodeURIComponent(name),
    }
  }
  return closest
}
// Gentle sea shimmer: repaints only while the camera is still, slow, and on screen.
function startShimmer(m:maplibregl.Map,busy:()=>boolean){
  const calm=matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).has('nofx')
  if(calm||!m.getLayer('water'))return undefined
  const a=[176,218,220],b=[120,181,198]
  return window.setInterval(()=>{
    if(document.hidden||busy()||m.isMoving()||m.getZoom()>12.5)return
    const k=(Math.sin(performance.now()/1400)+1)/2
    const c=a.map((v,i)=>Math.round(v+(b[i]-v)*k))
    try{m.setPaintProperty('water','fill-color','rgb('+c.join(',')+')')}catch{}
  },100)
}

export function PlaceCard({place,close}:{place:SuggestedPlace;close:()=>void}){
  const [preview,setPreview]=useState<Awaited<ReturnType<typeof loadPlacePreview>>>()
  const [guide,setGuide]=useState<Awaited<ReturnType<typeof loadTravelGuide>>>()
  const [articleId,setArticleId]=useState(place.pageId)
  const [imageFailed,setImageFailed]=useState(false)
  const closeButton=useRef<HTMLButtonElement>(null)
  const opener=useRef<Element|null>(null)
  useEffect(()=>{
    opener.current=document.activeElement
    closeButton.current?.focus()
  },[])
  function dismiss(){
    close()
    if(opener.current instanceof SVGElement)opener.current.focus({preventScroll:true})
  }
  useEffect(()=>{
    const controller=new AbortController()
    const timeout=setTimeout(()=>controller.abort(),8000)
    const {signal}=controller
    async function loadDetails(){
      const article=place.pageId===undefined&&place.kind==='city'
        ? await findCityArticle(place,signal).catch(()=>undefined)
        : undefined
      if(signal.aborted)return
      const id=place.pageId??article?.pageid
      setArticleId(id)
      if(id!==undefined)loadPlacePreview(id,signal).then(data=>{
        if(!signal.aborted)setPreview(data)
      }).catch(()=>{/* The short description is available immediately. */})
      if(id!==undefined||place.kind==='city')loadTravelGuide(article?.title??place.name,signal).then(data=>{
        if(!signal.aborted)setGuide(data)
      }).catch(()=>{/* The Wikipedia preview remains available independently. */})
    }
    void loadDetails()
    return ()=>{clearTimeout(timeout);controller.abort()}
  },[place])
  return <aside className="place-card panel" aria-label={place.name} onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();dismiss()}
  }}>
    <header className="place-card-header">
      <h2>{place.name}</h2>
      <button type="button" ref={closeButton} aria-label="Close place information" onClick={dismiss}><CloseIcon/></button>
    </header>
    <div className="place-card-body" tabIndex={0} role="region" aria-label="Place details">
      <p className="place-summary">{place.description}</p>
      {guide&&<section className="place-guide">
        {guide.notes.length>0&&<>
          <h3>Backpacker notes</h3>
          {guide.notes.map(note=><blockquote key={note.label} cite={guide.url}>
            <strong>{note.label}</strong>
            <p><q>{note.quote}</q></p>
          </blockquote>)}
        </>}
        <a href={guide.url} target="_blank" rel="noreferrer">Wikivoyage travel guide ↗</a>
        {guide.notes.length>0&&<> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></>}
      </section>}
      {preview?.thumbnail&&preview.pageimage&&!imageFailed&&
        <a className="place-photo" href={'https://en.wikipedia.org/wiki/File:'+encodeURIComponent(preview.pageimage)} target="_blank" rel="noreferrer" aria-label={'Photo of '+place.name+' and credits'}>
          <img src={preview.thumbnail.source} alt={place.name} onError={()=>setImageFailed(true)}/>
        </a>}
      {preview?.extract?.trim()&&<p>{preview.extract.trim()}</p>}
      {place.popularity&&<small>{place.popularity}</small>}
      <a href={articleId===undefined?place.sourceUrl:'https://en.wikipedia.org/?curid='+articleId} target="_blank" rel="noreferrer">Read on Wikipedia ↗</a>
    </div>
  </aside>
}
export function RouteMap(props:Props){
  const host=useRef<HTMLDivElement>(null), svg=useRef<SVGSVGElement>(null), map=useRef<maplibregl.Map|null>(null)
  const current=useRef(props); current.current=props
  const drag=useRef<Drag|null>(null), clouds=useRef<HTMLDivElement>(null)
  const syncOverlay=useRef<()=>void>(()=>{})
  const visiblePlaces=useRef<{place:SuggestedPlace;point:Point}[]>([])
  const cityLayers=useRef<string[]>([])
  const [,redraw]=useState(0), [message,setMessage]=useState(''), [hint,setHint]=useState('')
  const [places,setPlaces]=useState<Awaited<ReturnType<typeof suggestPlaces>>>([])
  const {placeCard,selectPlace}=props
  const [camera,setCamera]=useState(0)
  const [sel,setSel]=useState<{id:string;angle:number}|null>(null)
  useEffect(()=>{
    const first=current.current.trip
    let engine:maplibregl.Map, shimmer:number|undefined
    try{
      const key=import.meta.env.VITE_MAPTILER_KEY
      engine=new maplibregl.Map({container:host.current!, style:key?'https://api.maptiler.com/maps/streets-v2/style.json?key='+encodeURIComponent(key):'https://tiles.openfreemap.org/styles/liberty', center:[first.stops[0].lng,first.stops[0].lat],zoom:7,attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false})
    }catch{setMessage('The map needs WebGL. Enable graphics acceleration and reload.');return}
    map.current=engine
    const bounds=new maplibregl.LngLatBounds()
    first.stops.forEach(s=>bounds.extend([s.lng,s.lat]))
    if(first.stops.length>1) engine.fitBounds(bounds,{padding:{left:64,right:Math.min(330,innerWidth*.27),top:140,bottom:100},duration:0,maxZoom:9})
    engine.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-left')
    let cameraDirty=true
    engine.on('move',()=>{cameraDirty=true})
    engine.on('resize',()=>{cameraDirty=true;setCamera(v=>v+1)})
    engine.on('render',()=>{
      if(!cameraDirty)return
      cameraDirty=false
      syncOverlay.current()
      if(clouds.current){
        const opacity=engine.getZoom()>11?'0':''
        if(clouds.current.style.opacity!==opacity)clouds.current.style.opacity=opacity
      }
    })
    engine.on('moveend',()=>{if(import.meta.env.DEV)(window as any).__moveend=performance.now();setCamera(v=>v+1)})
    engine.on('style.load',()=>{cityLayers.current=addCityDots(engine)})
    engine.on('load',()=>{if(!import.meta.env.VITE_MAPTILER_KEY){paintMap(engine);shimmer=startShimmer(engine,()=>!!drag.current)};setMessage('');setCamera(v=>v+1)})
    engine.on('error',()=>{if(!engine.isStyleLoaded())setMessage('Map tiles are unavailable. Check your connection.')})
    engine.on('click',e=>{
      const {trip,commit,selectPlace}=current.current
      const city=cityNear(engine,cityLayers.current,e.point,e.lngLat.lng,9)
      if(city){selectPlace(city);return}
      const place={name:'Map stop',lng:e.lngLat.wrap().lng,lat:e.lngLat.lat}
      const paths=Array.from(svg.current?.querySelectorAll<SVGPathElement>('path[data-leg]')??[])
      let nearest=0,best=Infinity
      paths.forEach((path,index)=>{
        const length=path.getTotalLength()
        for(let i=0;i<=24;i++){const p=path.getPointAtLength(length*i/24),d=Math.hypot(e.point.x-p.x,e.point.y-p.y);if(d<best){best=d;nearest=index}}
      })
      commit(insert(trip,nearest,place))
    })
    syncOverlay.current();setCamera(v=>v+1)
    return ()=>{clearInterval(shimmer);cityLayers.current=[];map.current=null;engine.remove()}
  },[])
  useEffect(()=>{
    if(!map.current)return
    const controller=new AbortController(), engine=map.current
    const timer=setTimeout(async()=>{
      if(engine.isMoving()||controller.signal.aborted)return
      const b=engine.getBounds()
      if(engine.getZoom()<4){setPlaces([]);return}
      try{const result=await suggestPlaces({west:b.getWest(),east:b.getEast(),north:b.getNorth(),south:b.getSouth()},controller.signal)
        if(!controller.signal.aborted){setPlaces(result);if(import.meta.env.DEV)requestAnimationFrame(()=>{(window as any).__placesAt=performance.now()})}
      }catch{if(!controller.signal.aborted)setPlaces([])}
    },80)
    const cancel=()=>{clearTimeout(timer);controller.abort()}
    engine.on('movestart',cancel)
    return ()=>{engine.off('movestart',cancel);cancel()}
  },[camera])
  useEffect(()=>{if(message){const t=setTimeout(()=>setMessage(''),6000);return ()=>clearTimeout(t)}},[message])
  const trip=drag.current?.draft??props.trip
  const slack=Math.max(0,remaining(trip)), ratio=slack/Math.max(1,stayBudget(trip.total))
  const candidates=useMemo(()=>[...places,...localPlaces],[places])
  useLayoutEffect(()=>{
    const overlay=svg.current!
    const pins=Array.from(overlay.querySelectorAll<SVGGElement>('.place-pin'))
    const legs=Array.from(overlay.querySelectorAll<SVGGElement>('[data-route-leg]')).map(leg=>({
      paths:leg.querySelectorAll('path'),
      tag:leg.querySelector('.map-tag'),
    }))
    const stops=Array.from(overlay.querySelectorAll<SVGGElement>('[data-route-stop]')).map(stop=>({
      group:stop,
      ball:stop.querySelector('[data-ball]')!,
      label:stop.querySelector('.map-label')!,
      tag:stop.querySelector('.map-tag'),
      handle:stop.querySelector('.stop-handle'),
    }))
    const cat=overlay.querySelector('[data-route-cat]')
    let lastScale:number|undefined
    // The camera changes SVG geometry. React keeps ownership of the contents and handlers.
    syncOverlay.current=()=>{
      const engine=map.current
      if(!engine)return
      overlay.removeAttribute('visibility')
      const {clientWidth:width,clientHeight:height}=engine.getContainer()
      const centerLng=engine.getCenter().lng,zoom=engine.getZoom(),scale=ballScale(zoom)
      const points=projectStops(engine,trip,centerLng)
      const visible:typeof visiblePlaces.current=[]
      pins.forEach((pin,i)=>{
        const place=candidates[i]
        const point=engine.project([nearbyLongitude(place.lng,centerLng),place.lat])
        const show=visible.length<10&&point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height&&
          (place.pageId===undefined||zoom>=4)&&
          visible.every(other=>Math.hypot(point.x-other.point.x,point.y-other.point.y)>=24)
        if(show&&pin.hasAttribute('display'))pin.removeAttribute('display')
        if(!show&&!pin.hasAttribute('display'))pin.setAttribute('display','none')
        if(show){
          pin.setAttribute('transform',translate(point))
          visible.push({place,point})
        }
      })
      visiblePlaces.current=visible
      legs.forEach(({paths,tag},i)=>{
        const {path,center}=curve(points[i],points[(i+1)%points.length],ratio,trip.mode==='loop',points.length===1)
        paths.forEach(node=>node.setAttribute('d',path))
        tag?.setAttribute('transform',translate({x:center.x,y:center.y+15}))
        if(i===0)cat?.setAttribute('transform',translate({x:center.x-20,y:center.y-41}))
      })
      stops.forEach(({group,ball,label,tag,handle},i)=>{
        group.setAttribute('transform',translate(points[i]))
        if(scale===lastScale)return
        const r=radius(trip.stops[i].days)
        const offset=r*scale-r
        ball.setAttribute('transform',`scale(${scale})`)
        label.setAttribute('y',String(r*scale+18))
        tag?.setAttribute('transform',translate({x:r*scale,y:-r*scale}))
        if(handle&&sel)handle.setAttribute('transform',translate({x:Math.cos(sel.angle)*offset,y:Math.sin(sel.angle)*offset}))
      })
      lastScale=scale
    }
    syncOverlay.current()
  },[trip,ratio,candidates,sel,props.notes])
  function point(e:ReactPointer){const box=svg.current!.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top}}
  function begin(e:ReactPointer,kind:Drag['kind'],index:number){
    if(e.button!==0||drag.current)return
    e.preventDefault(); e.stopPropagation()
    const origin=point(e)
    const engine=map.current
    if(!engine)return
    const p=projectStops(engine,trip)[index]
    drag.current={kind,index,origin,base:props.trip,draft:props.trip,started:false,radius:p?Math.hypot(origin.x-p.x,origin.y-p.y):0}
    svg.current!.setPointerCapture(e.pointerId)
    if(kind==='size'&&p)setSel({id:trip.stops[index].id,angle:Math.atan2(origin.y-p.y,origin.x-p.x)})
    selectPlace(null)
  }
  function move(e:ReactPointer){
    const d=drag.current
    const engine=map.current
    if(!engine||!d)return
    const p=point(e), {base,index}=d
    if(!d.started && Math.hypot(p.x-d.origin.x,p.y-d.origin.y)<4)return
    d.started=true
    if(d.kind==='size'){
      const old=base.stops[index], center=projectStops(engine,base)[index]
      const delta=Math.hypot(p.x-center.x,p.y-center.y)-d.radius
      d.draft=allocate(base,'stops',index,old.days+Math.round(delta/4))
      setSel({id:old.id,angle:Math.atan2(p.y-center.y,p.x-center.x)})
    }else{
      const ll=engine.unproject([p.x,p.y])
      const wrapped=ll.wrap()
      let place:Place={lng:wrapped.lng,lat:wrapped.lat,name:'Map stop'}
      let best=26
      for(const {place:item,point:q} of visiblePlaces.current){const dist=Math.hypot(q.x-p.x,q.y-p.y)
        if(dist<best){place=item;best=dist}}
      place=cityNear(engine,cityLayers.current,p,ll.lng,best)??place
      if(d.kind==='pull'){
        if(d.draft===base)d.draft=insert(base,index,place)
        d.draft={...d.draft,stops:d.draft.stops.map((s,i)=>i===index+1?{...s,...place}:s)}
        const next=base.stops[(index+1)%base.stops.length]
        setHint(base.stops.length===1?km(base.stops[0],place)+' each way':km(base.stops[index],place)+' · '+km(place,next))
      }else{
        d.draft={...base,stops:base.stops.map((s,i)=>i===index?{...s,...place}:s)}
      }
    }
    props.preview(d.draft);redraw(v=>v+1)
  }
  function end(cancel:boolean){
    const d=drag.current;if(!d)return
    drag.current=null;props.preview(null);setHint('')
    if(!cancel){
      if(d.started&&d.draft!==d.base)props.commit(d.draft)
      else if(!d.started){
        if(d.kind==='move'){const id=d.base.stops[d.index].id;setSel(v=>v?.id===id?null:{id,angle:-Math.PI/4})}
        props.select({kind:d.kind==='pull'?'legs':'stops',index:d.index})
      }
    }
    redraw(v=>v+1)
  }
  const c=slack?'#e4572e':'#2f8f6b'
  return <><div className="basemap" ref={host}/>{!new URLSearchParams(location.search).has('nofx')&&<div className="clouds" ref={clouds} aria-hidden="true"><i/><i/></div>}<svg ref={svg} className="route-overlay" visibility="hidden" aria-label="Trip yarn and stops" onPointerMove={move} onPointerUp={e=>{
    if(drag.current?.started&&drag.current.kind!=='size')move(e)
    end(false)
  }} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(true)}>
    {candidates.map(s=>
      <g className="place-pin" data-kind={s.kind} key={s.sourceUrl}
        role="button" tabIndex={0} aria-label={s.name} aria-expanded={placeCard?.sourceUrl===s.sourceUrl}
        onClick={()=>selectPlace(s)} onKeyDown={e=>{
          if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPlace(s)}
          if(e.key==='Escape')selectPlace(null)
        }}>
        <title>{s.name}</title><circle className="place-pin-hit" r="11"/><circle className="place-pin-dot" r="4.5"/><text x="10" y="4">{s.name}</text>
      </g>
    )}
    {trip.legs.map((leg,i)=><g key={leg.id} data-route-leg>
      <path stroke="#22302a" strokeWidth="8"/><path stroke={c} strokeWidth="5.5"/><path stroke="#ffd9bd" strokeWidth="1.8" strokeDasharray="5 5"/>
      <path data-leg={i} className="grab-leg" onPointerDown={e=>begin(e,'pull',i)}/>
      {props.notes&&<g className="map-tag" onClick={()=>props.select({kind:'legs',index:i})}><title>{leg.days} {leg.days===1?'night':'nights'} in transit</title><rect x="-22" y="-10" width="44" height="22" rx="5"/><text textAnchor="middle" y="5">✉ {leg.days}n</text></g>}
    </g>)}
    {trip.legs.length>0&&<g data-route-cat><Cat width="40" height="44" mood={slack?'wobbly':'celebrate'}/></g>}
    {trip.stops.map((s,i)=>{const r=radius(s.days);return <g key={s.id} data-route-stop>
      <g data-ball>
        <YarnBall x={-r} y={-r} width={2*r} height={2*r} green={!slack}/>
        <circle className="stop-center" r={r-4.5} onPointerDown={e=>begin(e,'move',i)}><title>{s.name} · Drag to move or click for details</title></circle>
        <circle className="stop-edge" r={r} onPointerDown={e=>begin(e,'size',i)}><title>Drag edge to resize stay</title></circle>
      </g>
      {sel?.id===s.id&&(()=>{const cx=Math.cos(sel.angle),cy=Math.sin(sel.angle),x1=cx*(r-6),y1=cy*(r-6),x2=cx*(r+38),y2=cy*(r+38);return <g className="stop-handle" onPointerDown={e=>begin(e,'size',i)}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22302a" strokeWidth="7.5" strokeLinecap="round"/><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c99a62" strokeWidth="4" strokeLinecap="round"/>
        <line className="stop-handle-hit" x1={x1} y1={y1} x2={x2} y2={y2}/><circle cx={x2} cy={y2} r="10" fill="#ffc93c" stroke="#22302a" strokeWidth="2.8"><title>Drag to change the number of stays</title></circle></g>})()}
      <text className="map-label" textAnchor="middle">{s.name} · {s.days} {s.days===1?'stay':'stays'}</text>
      {props.notes&&<g className="map-tag" onClick={()=>props.select({kind:'stops',index:i})}><rect width="25" height="20" rx="4"/><text x="5" y="15">✉</text></g>}
    </g>})}
  </svg>
  {(hint||message)&&<output className="map-message">{hint||message}</output>}</>
}

