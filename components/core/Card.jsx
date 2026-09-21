import React from 'react';

export function Card({ children, padding = 'l' }) {
  const pad = padding === 's' ? 'var(--space-m)' : padding === 'm' ? 'var(--space-l)' : 'var(--space-xl)';
  return (
    <div style={{
      background: 'var(--surface-card)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-card)',
      padding: pad, fontFamily: 'var(--font-body)',
    }}>
      {children}
    </div>
  );
}
