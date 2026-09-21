function HomeScreen({ Card, Badge, Button, Icon, onOpenAsk, onOpenCheckin }) {
  return (
    <div style={{ padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', gap: '22px', boxSizing: 'border-box' }}>
      <div>
        <div style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-muted)' }}>Hola, Andrea</div>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--text-editorial-l)', color: 'var(--text-primary)', marginTop: '4px' }}>¿En qué podemos acompañarte hoy?</h1>
      </div>
      <button type="button" onClick={onOpenAsk} style={{
        textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
        background: 'var(--surface-card)', borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-l)',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--action-primary)' }}>
          <Icon name="message" size={20} />
          <span style={{ fontWeight: 600, fontSize: 'var(--text-body-m)' }}>Hablar con Mindi</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-m)' }}>Cuéntame qué estás sintiendo o qué te preocupa.</p>
      </button>
      <div>
        <h3 style={{ fontSize: 'var(--text-heading-m)', color: 'var(--text-primary)', marginBottom: '10px' }}>Para ti</h3>
        <Card padding="m">
          <Badge tone="neutral">Síntomas</Badge>
          <p style={{ marginTop: '10px', fontSize: 'var(--text-body-m)', color: 'var(--text-primary)' }}>Los sofocos, explicados con calma</p>
        </Card>
      </div>
      <div>
        <h3 style={{ fontSize: 'var(--text-heading-m)', color: 'var(--text-primary)', marginBottom: '10px' }}>A otras mujeres también les pasa</h3>
        <Card padding="m">
          <p style={{ fontSize: 'var(--text-body-m)', color: 'var(--text-secondary)' }}>"Pensé que era la única a la que le costaba dormir así. Ayuda saber que no es raro."</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '8px' }}>Ejemplo de historia para prototipo — no representa un testimonio real.</p>
        </Card>
      </div>
      <button type="button" onClick={onOpenCheckin} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-m)', background: 'transparent', padding: '14px 16px', cursor: 'pointer', fontFamily: 'var(--font-ui)', minHeight: '44px',
      }}>
        <span style={{ fontSize: 'var(--text-body-s)', color: 'var(--text-secondary)' }}>¿Quieres registrar cómo te sientes hoy? Es opcional.</span>
        <Icon name="chevronDown" size={16} style={{ transform: 'rotate(-90deg)', color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}
