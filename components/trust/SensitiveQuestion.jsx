import React, { useState } from 'react';

export function SensitiveQuestion({ question, reason, onAnswer, onDecline }) {
  const [declined, setDeclined] = useState(false);
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-l)', fontFamily: 'var(--font-ui)' }}>
      <p style={{ fontSize: 'var(--text-body-l)', color: 'var(--text-primary)' }}>{question}</p>
      {reason && <p style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-muted)', marginTop: '8px' }}>Te pregunto esto porque {reason}</p>}
      {declined ? (
        <p style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-muted)', marginTop: '12px' }}>Sin problema. Podemos seguir sin esa información.</p>
      ) : (
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button type="button" onClick={onAnswer} style={{
            fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 'var(--text-body-s)', minHeight: '44px',
            padding: '10px 20px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'var(--action-primary)', color: '#fff', cursor: 'pointer',
          }}>Responder</button>
          <button type="button" onClick={() => { setDeclined(true); onDecline && onDecline(); }} style={{
            fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 'var(--text-body-s)', minHeight: '44px',
            padding: '10px 20px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Prefiero no responder</button>
        </div>
      )}
    </div>
  );
}
