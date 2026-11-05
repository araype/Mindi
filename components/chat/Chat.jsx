import React from 'react';

/** Marco del chat: claro para el test (10.1) u oscuro para el chat con IA (10.5). */
export function Chat({ dark, status, children }) {
  return (
    <div className={dark ? 'm-chat m-chat--dark' : 'm-chat'}>
      <div className="m-chat__head">
        <span className="m-avatar" aria-hidden="true">M</span>
        <span><b>Mindi</b>{status && <span className="m-chat__status">{status}</span>}</span>
      </div>
      <div className="m-chat__body">{children}</div>
    </div>
  );
}

/** Burbuja. from="bot" | "me". En el tema oscuro usa m-msg. example: texto chico debajo. */
export function Bubble({ from = 'bot', dark, example, children }) {
  if (dark) return <div className={from === 'me' ? 'm-msg m-msg--user' : 'm-msg m-msg--bot'}>{children}</div>;
  return (
    <div className={from === 'me' ? 'm-bubble m-bubble--me' : 'm-bubble m-bubble--bot'}>
      {children}
      {example && <small>{example}</small>}
    </div>
  );
}

/** Escala 0–4 del test: lista vertical con el número en su color y la frase propia de la pregunta. */
export function Scale({ labels, onPick }) {
  return (
    <div className="m-scale m-scale--list" role="group" aria-label="Intensidad de 0 a 4">
      {labels.map((label, n) => (
        <button type="button" key={n} onClick={() => onPick && onPick(n, label)}>
          <b aria-hidden="true">{n}</b><span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Barra del resultado (10.2): Cuerpo, Ánimo o Vida íntima, con el porcentaje a la derecha. */
export function AreaBar({ label, pct }) {
  return (
    <div className="m-bar is-on" style={{ '--w': `${pct}%` }}>
      <span className="m-bar__label"><span>{label}</span><b>{pct}%</b></span>
      <span className="m-bar__track"><i /></span>
    </div>
  );
}
