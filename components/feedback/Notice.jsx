import React from 'react';

/** Aviso de las banderas rojas (10.3), sin rojo: emergency = acento ciruela; eval = acento magenta. */
export function Notice({ kind = 'eval', title, children }) {
  return (
    <div className={`m-notice m-notice--${kind}`} role={kind === 'emergency' ? 'alert' : 'status'}>
      {title && <p className="m-notice__title">{title}</p>}
      {children}
    </div>
  );
}
