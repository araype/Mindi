import React from 'react';

export function TrustPanel({ children }) {
  return (
    <div style={{
      background: 'var(--sand-200)', borderRadius: 'var(--radius-m)', padding: 'var(--space-m)',
      fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-body)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      {children}
    </div>
  );
}
