import React from 'react';

/** Campo con etiqueta visible (m-field + m-input), como en las listas de espera. */
export function Field({ id, label, type = 'text', ...rest }) {
  return (
    <div className="m-field">
      <label htmlFor={id}>{label}</label>
      <input className="m-input" id={id} type={type} {...rest} />
    </div>
  );
}

/** Casilla de consentimiento: nunca marcada por defecto (handoff 11.9). */
export function Check({ children, ...rest }) {
  return <label className="m-check"><input type="checkbox" {...rest} /><span>{children}</span></label>;
}
