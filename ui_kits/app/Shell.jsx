function PhoneFrame({ children }) {
  return (
    <div style={{
      width: '380px', height: '760px', background: 'var(--surface-page)', borderRadius: '36px',
      boxShadow: 'var(--shadow-raised)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui)', border: '8px solid var(--ink-900)',
    }}>
      {children}
    </div>
  );
}

function BottomNav({ active, onSelect, Icon }) {
  const items = [
    { key: 'home', label: 'Inicio', icon: 'home' },
    { key: 'mindi', label: 'Mindi', icon: 'message' },
    { key: 'resources', label: 'Recursos', icon: 'book' },
    { key: 'profile', label: 'Perfil', icon: 'user' },
  ];
  return (
    <nav aria-label="Navegación principal" style={{
      display: 'flex', borderTop: '1px solid var(--border-default)', background: 'var(--surface-card)',
      padding: '8px 8px 16px', flexShrink: 0,
    }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-current={active === it.key ? 'page' : undefined}
          onClick={() => onSelect(it.key)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minHeight: '44px',
            border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            fontSize: 'var(--text-caption)', fontWeight: 600, padding: '6px 4px',
            color: active === it.key ? 'var(--action-primary)' : 'var(--text-muted)',
          }}
        >
          <Icon name={it.icon} size={20} />
          {it.label}
        </button>
      ))}
    </nav>
  );
}
