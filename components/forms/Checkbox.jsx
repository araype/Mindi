import React from 'react';

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

export function Checkbox({ label, checked, onChange, id }) {
  const inputId = id || nextId('checkbox');
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--text-primary)', cursor: 'pointer', minHeight: '44px' }}>
      <input
        id={inputId}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{
          width: '20px', height: '20px', flexShrink: 0, accentColor: 'var(--action-primary)', cursor: 'pointer',
        }}
      />
      {label}
    </label>
  );
}
