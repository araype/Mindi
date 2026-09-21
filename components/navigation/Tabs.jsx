import React, { useState, useRef } from 'react';

export function Tabs({ items = [], defaultActive = 0, onChange, label = 'Secciones' }) {
  const [active, setActive] = useState(defaultActive);
  const refs = useRef([]);
  const select = (i) => { setActive(i); onChange && onChange(i); };
  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    if (next !== null) { e.preventDefault(); select(next); refs.current[next] && refs.current[next].focus(); }
  };
  return (
    <div role="tablist" aria-label={label} style={{ display: 'flex', gap: '4px', background: 'var(--sand-200)', borderRadius: 'var(--radius-pill)', padding: '4px', fontFamily: 'var(--font-ui)', width: 'fit-content' }}>
      {items.map((item, i) => (
        <button
          key={item}
          ref={(el) => (refs.current[i] = el)}
          role="tab"
          type="button"
          aria-selected={active === i}
          tabIndex={active === i ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => select(i)}
          style={{
            padding: '10px 18px', minHeight: '40px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
            fontSize: 'var(--text-body-s)', fontWeight: 600,
            background: active === i ? 'var(--surface-card)' : 'transparent',
            color: active === i ? 'var(--action-primary)' : 'var(--text-secondary)',
            boxShadow: active === i ? 'var(--shadow-card)' : 'none',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
