import React from 'react';

/** Botón de Mindi (handoff 5.1). Solo pinta las clases m-btn de components.css. */
export function Button({ variant = 'primary', href, block, children, className = '', ...rest }) {
  const cls = ['m-btn', variant !== 'primary' && `m-btn--${variant}`, block && 'm-btn--block', className].filter(Boolean).join(' ');
  if (href) return <a className={cls} href={href} {...rest}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
