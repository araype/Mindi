import React from 'react';

export function SourceList({ sources = [] }) {
  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>Fuentes</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sources.map((s, i) => (
          <li key={i} style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)' }}>
            {s.href ? <a href={s.href} style={{ color: 'var(--brand-secondary)' }}>{s.label}</a> : s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
