import React, { useEffect, useRef } from 'react';

export function Dialog({ open, title, children, onClose, titleId = 'dialog-title' }) {
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      closeRef.current && closeRef.current.focus();
      const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        openerRef.current && openerRef.current.focus && openerRef.current.focus();
      };
    }
  }, [open]);
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,42,42,0.35)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontFamily: 'var(--font-ui)',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-raised)',
          padding: 'var(--space-xl)', maxWidth: '380px', width: '90%', position: 'relative',
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: '12px', right: '12px', width: '36px', height: '36px', border: 'none',
            background: 'transparent', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', borderRadius: '50%',
          }}
        >✕</button>
        {title && <h3 id={titleId} style={{ fontSize: 'var(--text-heading-l)', marginBottom: 'var(--space-s)', color: 'var(--text-primary)', paddingRight: '28px' }}>{title}</h3>}
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-m)', lineHeight: 'var(--lh-body)' }}>{children}</div>
      </div>
    </div>
  );
}
