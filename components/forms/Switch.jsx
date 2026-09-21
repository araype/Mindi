import React from 'react';

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

export function Switch({ checked, onChange, label, id }) {
  const inputId = id || nextId('switch');
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--text-primary)', cursor: 'pointer', minHeight: '44px' }}>
      <span style={{ position: 'relative', width: '44px', height: '26px', flexShrink: 0 }}>
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={!!checked}
          checked={!!checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', margin: 0 }}
        />
        <span aria-hidden="true" style={{
          position: 'absolute', inset: 0, borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--action-primary)' : 'var(--ink-200)', transition: 'background var(--duration-base) var(--ease-standard)',
          pointerEvents: 'none',
        }}>
          <span style={{
            position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '20px', height: '20px',
            borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-card)', transition: 'left var(--duration-base) var(--ease-gentle)',
          }} />
        </span>
      </span>
      {label}
    </label>
  );
}
