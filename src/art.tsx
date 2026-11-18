import type { SVGProps } from 'react'

type ArtProps = SVGProps<SVGSVGElement>
const ink = '#22302A'
const yarn = '#E4572E'
const highlight = '#FFB59A'
const blush = '#F59A9A'

export function YarnCatIcon(props: ArtProps) {
  return <svg width="44" height="50" viewBox="-26 -36 52 68" aria-hidden="true" {...props}>
    <path d="M-17 -12 L-14 -31 L-3 -19Z M3 -19 L14 -31 L17 -12Z" fill={yarn} stroke={ink} strokeWidth="2.6" strokeLinejoin="round"/>
    <path d="M-13.5 -15 L-12.5 -25 L-6.5 -18.5Z M6.5 -18.5 L12.5 -25 L13.5 -15Z" fill={blush}/>
    <circle r="22" fill={yarn} stroke={ink} strokeWidth="2.8"/>
    <path d="M-17 -8 C-7 -15 7 -15 17 -8 M-20.5 2 C-9 -6 9 -6 20.5 2 M-17 11 C-6 5 6 5 17 11" fill="none" stroke={highlight} strokeWidth="1.7"/>
    <path d="M-8.5 -1 q3 -3.5 6 0 M2.5 -1 q3 -3.5 6 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"/>
    <ellipse cx="-9" cy="5" rx="2.6" ry="1.5" fill={blush}/><ellipse cx="9" cy="5" rx="2.6" ry="1.5" fill={blush}/>
    <path d="M15 15 C24 22 20 30 12 30" fill="none" stroke={yarn} strokeWidth="2.6" strokeLinecap="round"/>
  </svg>
}

export function Brand({className = ''}: {className?: string}) {
  return <span className={'sl-wordmark ' + className}><YarnCatIcon/><span>slackline</span></span>
}

export function YarnBall({green = false, ...props}: ArtProps & {green?: boolean}) {
  return <svg width="40" height="40" viewBox="-23 -23 46 46" aria-hidden="true" {...props}>
    <circle r="20" fill={green ? '#2F8F6B' : yarn} stroke={ink} strokeWidth="2.5"/>
    <path d="M-15 -10 C-6 -17 7 -17 15 -10 M-19 -1 C-8 -9 8 -9 19 -1 M-17 8 C-6 2 6 2 17 8 M-10 15.5 C-3 12 3 12 10 15.5" fill="none" stroke={green ? '#A9DCC5' : highlight} strokeWidth="1.8"/>
    <path d="M-6 -19 C-15 -7 -15 7 -6 19 M5 -19.5 C13 -8 13 8 5 19.5" fill="none" stroke={green ? '#1E6B4F' : '#B8401F'} strokeWidth="1.4"/>
  </svg>
}

export type CatMood = 'eager' | 'wobbly' | 'steady' | 'happy' | 'celebrate' | 'focus' | 'no' | 'oops' | 'yay'

export function Cat({mood = 'eager', ...props}: ArtProps & {mood?: CatMood}) {
  const eager = mood === 'eager'
  const happy = ['happy', 'yay', 'celebrate'].includes(mood)
  const tail = happy || eager ? 'M-11 6 Q-25 -4 -19 -22 Q-16 -29 -10 -26' : 'M-12 8 Q-28 4 -30 -6'
  const ears = eager || mood === 'oops' ? 'M-2 -20 L0 -37 L9 -23Z M11 -23 L20 -37 L21 -18Z' : 'M-1 -20 L1 -33 L9 -23Z M11 -23 L19 -33 L20 -18Z'
  const silhouette = <><ellipse cx="0" cy="6" rx="12" ry="11"/><circle cx="9" cy="-12" r="12.5"/><path d={ears}/></>
  return <svg width="120" height="112" viewBox="-35 -47 75 72" aria-hidden="true" {...props}>
    <path d={tail} fill="none" stroke="white" strokeWidth="9.5" strokeLinecap="round"/>
    <g fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round">{silhouette}</g>
    <path d={tail} fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round"/>
    <g fill={ink}>{silhouette}</g><path d="M1 -24 L1.5 -31 L6 -24.5Z M13 -24.5 L18 -31 L18.5 -22Z" fill="#E98A8A"/>
    {happy || mood === 'no' ? <path d={happy ? 'M2 -12.5 q2.5 -3.5 5 0 M11.5 -12.5 q2.5 -3.5 5 0' : 'M2 -15 l4 2 -4 3 M16 -15 l-4 2 4 3'} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round"/> :
      [4.5,14].map(x => <g key={x}><circle cx={x} cy="-13" r={mood === 'oops' ? 4 : 3.4} fill="white"/><circle cx={x+.8} cy="-12.6" r="1.7" fill={ink}/><circle cx={x} cy="-14.2" r=".7" fill="white"/></g>)}
    {mood === 'wobbly' && <path d="M1 -17 L7 -18.5 M17 -17 L11 -18.5" stroke="white" strokeWidth="1.2"/>}
    <path d="M7.6 -7.8 q1.7 2.8 3.4 0Z" fill={blush}/>
    <g fill={blush}><ellipse cx="2.5" cy="-6.5" rx="2.6" ry="1.5"/><ellipse cx="17" cy="-6.5" rx="2.6" ry="1.5"/></g>
    <g fill="#3C4C45"><ellipse cx="5" cy="17" rx="5" ry="3"/><ellipse cx="13" cy="17" rx="5" ry="3"/></g>
    {eager && <><YarnBall x="19" y="3" width="17" height="17"/><ellipse cx="19" cy="5" rx="5" ry="3" fill="#3C4C45" transform="rotate(-30 19 5)"/></>}
    {(eager || happy) && <path d="M-6 -42 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1Z M28 -34 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1Z" fill="#FFC93C" stroke={ink} strokeWidth=".7"/>}
  </svg>
}
