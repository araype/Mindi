import React from 'react';

export function GuidanceCard({ title, children, limits }) {
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-l)', fontFamily: 'var(--font-ui)' }}>
      {title && <h3 style={{ fontSize: 'var(--text-heading-m)', color: 'var(--text-primary)', marginBottom: 'var(--space-s)' }}>{title}</h3>}
      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-m)', lineHeight: 'var(--lh-body)' }}>{children}</div>
      {limits && (
        <div style={{ marginTop: 'var(--space-m)', paddingTop: 'var(--space-m)', borderTop: '1px solid var(--border-default)', fontSize: 'var(--text-body-s)', color: 'var(--text-muted)' }}>
          {limits}
        </div>
      )}
    </div>
  );
}
