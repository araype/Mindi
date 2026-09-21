import React from 'react';

export function Toast({ tone = 'brand', urgent, children }) {
  const tones = {
    brand: { background: 'var(--brand-secondary)', color: '#fff' },
    success: { background: 'var(--success-text)', color: '#fff' },
    danger: { background: 'var(--danger-text)', color: '#fff' },
  };
  return (
    <div
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      style={{
        ...tones[tone], fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', fontWeight: 500,
        padding: '14px 20px', borderRadius: 'var(--radius-m)', boxShadow: 'var(--shadow-raised)',
        display: 'inline-flex', alignItems: 'center', gap: '10px',
      }}
    >
      {children}
    </div>
  );
}
