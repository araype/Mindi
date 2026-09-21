import React from 'react';

export function Button({ variant = 'primary', size = 'm', disabled, icon, children, style: styleProp, ...rest }) {
  const pad = size === 's' ? '10px 18px' : size === 'l' ? '16px 28px' : '13px 22px';
  const font = size === 's' ? 'var(--text-body-s)' : 'var(--text-body-m)';
  const minH = size === 's' ? '40px' : '44px';
  const base = {
    fontFamily: 'var(--font-ui)', fontSize: font, fontWeight: 600, border: '1px solid transparent',
    borderRadius: 'var(--radius-pill)', padding: pad, minHeight: minH, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
    opacity: disabled ? 0.5 : 1, WebkitTapHighlightColor: 'transparent',
  };
  const variants = {
    primary: { background: 'var(--action-primary)', color: 'var(--text-on-brand)' },
    secondary: { background: 'var(--brand-secondary)', color: 'var(--text-on-brand)' },
    outline: { background: 'transparent', color: 'var(--brand-secondary)', borderColor: 'var(--border-strong)' },
    ghost: { background: 'transparent', color: 'var(--brand-secondary)' },
  };
  const style = { ...base, ...variants[variant], ...styleProp };
  return (
    <button
      type="button"
      style={style}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
