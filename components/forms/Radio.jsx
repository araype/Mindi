import React from 'react';

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

export function Radio({ label, checked, onChange, name, id }) {
  const inputId = id || nextId('radio');
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--text-primary)', cursor: 'pointer', minHeight: '44px' }}>
      <input
        id={inputId}
        type="radio"
        name={name}
        checked={!!checked}
        onChange={() => onChange && onChange(true)}
        style={{ width: '20px', height: '20px', flexShrink: 0, accentColor: 'var(--action-primary)', cursor: 'pointer' }}
      />
      {label}
    </label>
  );
}
