import React from 'react';

export function Tag({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', fontWeight: 500, minHeight: '44px',
        padding: '10px 18px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${selected ? 'var(--action-primary)' : 'var(--border-default)'}`,
        background: selected ? 'var(--terracotta-100)' : 'var(--surface-card)',
        color: selected ? 'var(--action-primary)' : 'var(--text-secondary)',
        transition: 'background var(--duration-fast) var(--ease-standard)',
      }}
    >
      {selected && <span aria-hidden="true" style={{ marginRight: '6px' }}>✓</span>}
      {children}
    </button>
  );
}
