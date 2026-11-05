import React from 'react';

/** Tarjeta (handoff 5.4 y 10.4): blanca con borde --line, o translúcida sobre fotos (glass). */
export function Card({ glass, eyebrow, title, children }) {
  return (
    <div className={glass ? 'm-card m-card--glass' : 'm-card'}>
      {eyebrow && <p className="m-eyebrow">{eyebrow}</p>}
      {title && <h3 className="m-h3">{title}</h3>}
      {children}
    </div>
  );
}

/** Etiqueta de sección: cuadrado magenta + Space Mono en mayúsculas (5.2). */
export function Eyebrow({ children }) {
  return <p className="m-eyebrow">{children}</p>;
}

/** Chip del tema o de la etiqueta del resultado (sev: fondo --sev-bg, 10.2). */
export function Chip({ sev, children }) {
  return <span className={sev ? 'm-chip m-chip--sev' : 'm-chip'}>{children}</span>;
}
