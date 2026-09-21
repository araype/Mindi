import React from 'react';

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

export function Input({ label, placeholder, type = 'text', helperText, error, id, ...rest }) {
  const inputId = id || nextId('input');
  const helperId = helperText ? `${inputId}-helper` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-ui)', width: '100%' }}>
      {label && <label htmlFor={inputId} style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        aria-invalid={error || undefined}
        aria-describedby={helperId}
        style={{
          fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', padding: '13px 16px', minHeight: '44px',
          borderRadius: 'var(--radius-m)', border: `1.5px solid ${error ? 'var(--danger-500)' : 'var(--border-default)'}`,
          background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none',
        }}
        {...rest}
      />
      {helperText && <span id={helperId} style={{ fontSize: 'var(--text-caption)', color: error ? 'var(--danger-text)' : 'var(--text-muted)' }}>{helperText}</span>}
    </div>
  );
}
