import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Brand, YarnBall } from './art';
import { stayBudget } from './model';
import './chrome.css';

type ChromeProps = {
  name: string;
  total: number;
  remaining: number;
  routeLabel: string;
  notes: boolean;
  onName: (name: string) => void;
  onTrips: () => void;
  onNotes: () => void;
  onTotal: (days: number) => void;
  placeCard: ReactNode;
  onShowTips: () => void;
};

export function PencilIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 13l.6-3L11 2.6 13.4 5 6 12.4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>;
}

export function NotesIcon() {
  return <svg width="18" height="16" viewBox="0 0 18 14" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="16" height="12" rx="1.5" strokeWidth="1.8"/>
    <path d="M9 3v8M3 5h4M3 8h4" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="11.5" y="3" width="3.5" height="4" fill="currentColor" stroke="none"/>
  </svg>;
}

export function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="m3 3 8 8m0-8-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>;
}

function TripName({name, onName}: Pick<ChromeProps, 'name' | 'onName'>) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  function save() {
    const value = draft.trim() || name;
    setDraft(value);
    if (value !== name) onName(value);
  }
  return <div className="sl-chrome-name">
    <input ref={ref} aria-label="Trip name" value={draft} maxLength={120}
      style={{width: Math.min(28, Math.max(6, draft.length + 1)) + 'ch'}}
      onChange={e => setDraft(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/>
    <button type="button" aria-label="Rename trip" onClick={() => {ref.current?.focus(); ref.current?.select();}}><PencilIcon/></button>
  </div>;
}

function Budget({total, remaining, onTotal}: Pick<ChromeProps, 'total' | 'remaining' | 'onTotal'>) {
  const budget = stayBudget(total);
  const used = budget - remaining;
  const available = Math.max(0, remaining);
  const full = remaining === 0;
  return <section className={'sl-budget' + (full ? ' sl-budget-full' : '')} aria-label="Stay budget">
    <div className="sl-budget-label"><strong>Stay budget</strong><span>Trip length</span></div>
    <div className="sl-budget-stepper">
      <button type="button" aria-label="Remove a day from the trip" disabled={total <= 1 || remaining <= 0} onClick={() => onTotal(total - 1)}>−</button>
      <span><b>{total}</b> {total === 1 ? 'day' : 'days'}</span>
      <button type="button" aria-label="Add a day to the trip" disabled={total >= 90} onClick={() => onTotal(total + 1)}>+</button>
    </div>
    <div className="sl-budget-count" role="status" aria-live="polite" aria-atomic="true">
      <strong>{available}</strong>
      <div><b>{available === 1 ? 'stay left' : 'stays left'}</b><small>{remaining < 0 ? `${-remaining} over budget` : `${used} of ${budget} planned`}</small></div>
      <div className="sl-budget-ball" aria-hidden="true">
        {full ? <svg width="52" height="52" viewBox="-26 -26 52 52"><g stroke="#22302A" strokeWidth="2.2"><rect x="-11" y="-15" width="22" height="30" fill="#F3E3C3"/><path d="M-11 -6h22m-22 8h22" stroke="#2F8F6B"/><rect x="-17" y="-22" width="34" height="7" rx="2" fill="#E6CFA4"/><rect x="-17" y="15" width="34" height="7" rx="2" fill="#E6CFA4"/></g></svg> :
          <YarnBall width={27 + 42 * available / Math.max(1, budget)} height={27 + 42 * available / Math.max(1, budget)}/>}
      </div>
    </div>
    <svg className="sl-budget-bar" viewBox="0 0 270 16" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1" y="2" width="268" height="12" rx="6" fill="#F1EDE4" stroke="currentColor" strokeWidth="1.6"/>
      {used > 0 && budget > 0 && <rect x="1" y="2" width={Math.max(8, 268 * Math.min(used / budget, 1))} height="12" rx="6" fill={full ? '#2F8F6B' : '#E4572E'} stroke="currentColor" strokeWidth="1.6"/>}
      {budget > 1 && budget <= 45 && Array.from({length: budget - 1}, (_, i) => <path key={i} d={'M' + (1 + 268 * (i+1) / budget) + ' 5v6'} stroke="currentColor" opacity=".25"/>)}
    </svg>
    <p>{remaining < 0 ? 'Add a day or reduce an overnight stay.' : budget === 0 ? 'A day trip has zero overnight stays' : full ? 'Every stay is planned' : 'Ball size shows the number of stays'}</p>
  </section>;
}

export function Chrome(props: ChromeProps) {
  const [tipsOpen, setTipsOpen] = useState(() => window.innerWidth >= 850 && window.innerHeight >= 600);
  return <div className="sl-chrome">
    <header className="sl-chrome-header">
      <div className="sl-chrome-brand"><button type="button" aria-label="SlackLine — My trips" onClick={props.onTrips}><Brand/></button></div>
      <div className="sl-chrome-trip"><TripName name={props.name} onName={props.onName}/><div className="sl-chrome-route" title={props.routeLabel}>{props.routeLabel}</div></div>
      <nav className="sl-chrome-actions" aria-label="Trip controls">
        <button type="button" onClick={props.onTrips}>My trips</button>
        <button type="button" aria-pressed={props.notes} onClick={props.onNotes}><NotesIcon/>{props.notes ? 'Hide notes' : 'Show notes'}</button>
      </nav>
    </header>
    <div className="sl-chrome-sidebar">
      <Budget {...props}/>
      {props.placeCard}
    </div>
    {tipsOpen && !props.placeCard ? <aside className="sl-chrome-tips">
      <button className="sl-tips-close" type="button" aria-label="Close tips" onClick={() => setTipsOpen(false)}><CloseIcon/></button>
      <h2>Try it</h2>
      <ol><li>Pull the yarn onto the map to add a stop.</li><li>Drag a ball to move it, or drag its edge to change the number of stays.</li><li>Click a strand to plan overnight travel or write a note.</li></ol>
    </aside> : <button type="button" className="sl-chrome-help" aria-label="Show tips" onClick={() => {props.onShowTips();setTipsOpen(true);}}>?</button>}
  </div>;
}

export default Chrome;
