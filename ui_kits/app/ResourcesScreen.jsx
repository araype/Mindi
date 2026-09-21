function ResourcesScreen({ Card, Badge, Tabs, Icon }) {
  const ARTICLES = [
    { title: 'Los sofocos, explicados con calma', tag: 'Síntomas', read: '4 min', reviewed: true },
    { title: 'Dormir mejor durante la perimenopausia', tag: 'Sueño', read: '5 min', reviewed: true },
    { title: 'Hablar con tu médico sin sentirte apurada', tag: 'Guías', read: '3 min', reviewed: false },
  ];
  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px', boxSizing: 'border-box' }}>
      <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--text-editorial-m)', color: 'var(--text-primary)' }}>Recursos</h1>
      <Tabs items={['Todos', 'Guardados']} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ARTICLES.map((a) => (
          <Card key={a.title} padding="m">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <Badge tone="neutral">{a.tag}</Badge>
                <p style={{ marginTop: '10px', fontSize: 'var(--text-body-m)', color: 'var(--text-primary)' }}>{a.title}</p>
              </div>
              <Icon name="bookmark" size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
              <span>{a.read} de lectura</span>
              <span>·</span>
              <span>{a.reviewed ? 'Revisado — ejemplo de fuente' : 'Aún sin revisión clínica'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
