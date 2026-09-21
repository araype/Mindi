function ProfileScreen({ Card, Switch, Button, Icon }) {
  const { useState } = React;
  const [reminders, setReminders] = useState(false);
  const [shareAnon, setShareAnon] = useState(false);
  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--terracotta-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--action-primary)', fontFamily: 'var(--font-editorial)', fontSize: '22px' }}>A</div>
        <div>
          <div style={{ fontSize: 'var(--text-heading-l)', fontFamily: 'var(--font-editorial)', color: 'var(--text-primary)' }}>Andrea</div>
          <div style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-muted)' }}>andrea@ejemplo.com</div>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 'var(--text-heading-m)', color: 'var(--text-primary)', marginBottom: '10px' }}>Recordatorios</h3>
        <Card padding="m">
          <Switch label="Recibir un recordatorio ocasional" checked={reminders} onChange={setReminders} />
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '8px' }}>Apagado por defecto. Si lo activas, puedes elegir cuándo y con qué frecuencia.</p>
        </Card>
      </div>
      <div>
        <h3 style={{ fontSize: 'var(--text-heading-m)', color: 'var(--text-primary)', marginBottom: '10px' }}>Privacidad y datos</h3>
        <Card padding="m">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Switch label="Compartir datos anónimos para mejorar Mindi" checked={shareAnon} onChange={setShareAnon} />
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>Apagado por defecto. Nunca incluye tu nombre ni datos de contacto.</p>
            <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', minHeight: '44px', fontFamily: 'var(--font-ui)' }}>
              <span style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="shield" size={16} />Ver qué comparto y por qué</span>
              <Icon name="chevronDown" size={16} style={{ transform: 'rotate(-90deg)', color: 'var(--text-muted)' }} />
            </button>
          </div>
        </Card>
      </div>
      <Button variant="outline">Cerrar sesión</Button>
    </div>
  );
}
