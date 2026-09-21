import React from 'react';

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

export function Select({ label, options = [], value, onChange, placeholder = 'Elige una opción', id }) {
  const selectId = id || nextId('select');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-ui)', width: '100%' }}>
      {label && <label htmlFor={selectId} style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>}
      <select
        id={selectId}
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', padding: '13px 16px', minHeight: '44px',
          borderRadius: 'var(--radius-m)', border: '1.5px solid var(--border-default)', background: 'var(--surface-card)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)', appearance: 'none',
        }}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
