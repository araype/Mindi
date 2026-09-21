import React from 'react';

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: { background: 'var(--sand-200)', color: 'var(--text-secondary)' },
    brand: { background: 'var(--terracotta-100)', color: 'var(--action-primary)' },
    success: { background: 'var(--success-tint)', color: 'var(--success-text)' },
    warning: { background: 'var(--warning-tint)', color: 'var(--warning-text)' },
    danger: { background: 'var(--danger-tint)', color: 'var(--danger-text)' },
  };
  return (
    <span style={{
      ...tones[tone], fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)', fontWeight: 600,
      padding: '4px 12px', borderRadius: 'var(--radius-pill)', display: 'inline-flex', alignItems: 'center',
    }}>
      {children}
    </span>
  );
}
