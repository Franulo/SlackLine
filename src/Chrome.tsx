import { useEffect, useRef, useState } from 'react';
import { Brand, YarnBall } from './art';
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
  const used = total - remaining;
  const full = remaining === 0;
  return <section className={'sl-budget' + (full ? ' sl-budget-full' : '')} aria-label="Day budget">
    <div className="sl-budget-label"><strong>Day budget</strong><span>Trip length</span></div>
    <div className="sl-budget-stepper">
      <button type="button" aria-label="Remove a day from the trip" disabled={total <= 2 || full} onClick={() => onTotal(total - 1)}>−</button>
      <span><b>{total}</b> days</span>
      <button type="button" aria-label="Add a day to the trip" disabled={total >= 90} onClick={() => onTotal(total + 1)}>+</button>
    </div>
    <div className="sl-budget-count" role="status" aria-live="polite" aria-atomic="true">
      <strong>{remaining}</strong>
      <div><b>{remaining === 1 ? 'day left' : 'days left'}</b><small>{used} of {total} planned</small></div>
      <div className="sl-budget-ball" aria-hidden="true">
        {full ? <svg width="52" height="52" viewBox="-26 -26 52 52"><g stroke="#22302A" strokeWidth="2.2"><rect x="-11" y="-15" width="22" height="30" fill="#F3E3C3"/><path d="M-11 -6h22m-22 8h22" stroke="#2F8F6B"/><rect x="-17" y="-22" width="34" height="7" rx="2" fill="#E6CFA4"/><rect x="-17" y="15" width="34" height="7" rx="2" fill="#E6CFA4"/></g></svg> :
          <YarnBall width={27 + 42 * remaining / total} height={27 + 42 * remaining / total}/>}
      </div>
    </div>
    <svg className="sl-budget-bar" viewBox="0 0 270 16" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1" y="2" width="268" height="12" rx="6" fill="#F1EDE4" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="1" y="2" width={Math.max(8, 268 * used / total)} height="12" rx="6" fill={full ? '#2F8F6B' : '#E4572E'} stroke="currentColor" strokeWidth="1.6"/>
      {total <= 45 && Array.from({length: total - 1}, (_, i) => <path key={i} d={'M' + (1 + 268 * (i+1) / total) + ' 5v6'} stroke="currentColor" opacity=".25"/>)}
    </svg>
    <p>{full ? 'Every day is planned' : remaining <= 4 ? 'Only ' + remaining + (remaining === 1 ? ' day' : ' days') + ' of yarn left' : 'Each ball’s size is days of stay'}</p>
  </section>;
}

export function Chrome(props: ChromeProps) {
  const [tipsOpen, setTipsOpen] = useState(() => window.innerWidth >= 850 && window.innerHeight >= 600);
  return <div className="sl-chrome">
    <header className="sl-chrome-header">
      <div className="sl-chrome-brand"><Brand/></div>
      <div className="sl-chrome-trip"><TripName name={props.name} onName={props.onName}/><div className="sl-chrome-route" title={props.routeLabel}>{props.routeLabel}</div></div>
      <nav className="sl-chrome-actions" aria-label="Trip controls">
        <button type="button" onClick={props.onTrips}>My trips</button>
        <button type="button" aria-pressed={props.notes} onClick={props.onNotes}><NotesIcon/>{props.notes ? 'Hide notes' : 'Show notes'}</button>
      </nav>
    </header>
    <Budget {...props}/>
    {tipsOpen ? <aside className="sl-chrome-tips">
      <button className="sl-tips-close" type="button" aria-label="Close tips" onClick={() => setTipsOpen(false)}><CloseIcon/></button>
      <h2>Try it</h2>
      <ol><li>Pull the yarn onto the map to add a stop.</li><li>Drag a ball to move it, or drag its edge to change stay days.</li><li>Click a strand to plan travel days or write a note.</li></ol>
    </aside> : <button type="button" className="sl-chrome-help" aria-label="Show tips" onClick={() => setTipsOpen(true)}>?</button>}
  </div>;
}

export default Chrome;
