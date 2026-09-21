import React from 'react';

export function ReviewedBy({ name, role, date, isPlaceholder = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', color: 'var(--text-muted)' }}>
      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--sand-200)', flexShrink: 0 }} aria-hidden="true" />
      <span>
        Revisado por <strong style={{ color: 'var(--text-secondary)' }}>{name}</strong>{role ? `, ${role}` : ''}{date ? ` · ${date}` : ''}
        {isPlaceholder && <span style={{ display: 'block', color: 'var(--warning-text)', fontSize: 'var(--text-caption)' }}>Marcador de posición — pendiente de revisión clínica real</span>}
      </span>
    </div>
  );
}
