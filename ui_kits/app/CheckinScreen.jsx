function CheckinScreen({ Tag, Button, Radio, onDone }) {
  const { useState } = React;
  const [selected, setSelected] = useState([]);
  const [unsure, setUnsure] = useState(false);
  const symptoms = ['Sofocos', 'Sueño irregular', 'Cambios de ánimo', 'Fatiga', 'Dolores', 'Otro'];
  const toggle = (s) => setSelected(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--text-editorial-m)', color: 'var(--text-primary)' }}>¿Cómo te has sentido?</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-m)', marginTop: '6px' }}>Esto es opcional. Elige lo que aplique, o nada si prefieres.</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {symptoms.map((s) => (
          <Tag key={s} selected={selected.includes(s)} onClick={() => toggle(s)}>{s}</Tag>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={unsure} onChange={(e) => setUnsure(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--action-primary)' }} />
        No sé cómo explicarlo
      </label>
      <div style={{ flex: 1 }} />
      <Button variant="primary" size="l" onClick={onDone}>Guardar</Button>
      <Button variant="ghost" size="m" onClick={onDone}>Omitir por ahora</Button>
    </div>
  );
}
