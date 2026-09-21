function AskMindiScreen({ Button, Icon, SensitiveQuestion, GuidanceCard, TrustPanel, ReviewedBy, SourceList }) {
  const { useState, useRef } = React;
  const [messages, setMessages] = useState([
    { from: 'mindi', text: 'Cuéntame qué estás sintiendo o qué te preocupa.' },
  ]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('intro');
  const listRef = useRef(null);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages((m) => [...m, { from: 'user', text: value }]);
    setInput('');
    if (stage === 'intro') {
      setTimeout(() => {
        setMessages((m) => [...m, { from: 'mindi', text: 'Entiendo. Para ubicar mejor qué puede estar pasando, quisiera preguntarte algo. Tú decides cuánto quieres contarme.' }, { from: 'sensitive' }]);
        setStage('asked');
      }, 300);
    } else if (stage === 'asked' || stage === 'declined') {
      setTimeout(() => setMessages((m) => [...m, { from: 'guidance' }]), 300);
      setStage('done');
    }
  };

  const onAnswerSensitive = () => { setMessages((m) => [...m, { from: 'user', text: 'Desde hace un par de meses.' }, { from: 'mindi', text: 'Gracias por contarme. Esto es lo que puedo ofrecerte:' }, { from: 'guidance' }]); setStage('done'); };
  const onDeclineSensitive = () => { setMessages((m) => [...m, { from: 'mindi', text: 'Sin problema, sigamos sin eso. Con lo que me contaste, esto es lo que puedo ofrecerte:' }, { from: 'guidance' }]); setStage('done'); };

  const suggestions = ['Sofocos', 'No puedo dormir bien', 'Cambios de ánimo'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '18px 20px 10px', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--text-editorial-m)', color: 'var(--text-primary)' }}>Hablar con Mindi</h1>
      </div>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => {
          if (m.from === 'sensitive') {
            return <SensitiveQuestion key={i} question="¿Hace cuánto notas estos cambios?" reason="puede ayudarme a entender mejor lo que estás viviendo." onAnswer={onAnswerSensitive} onDecline={onDeclineSensitive} />;
          }
          if (m.from === 'guidance') {
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <GuidanceCard title="Sobre lo que me cuentas" limits="Esto es orientación general, no un diagnóstico. Si el malestar es fuerte, repentino o te preocupa, conviene hablar con un profesional de salud.">
                  Lo que describes es algo que muchas mujeres notan en esta etapa. Puede ayudarte anotarlo unos días para ver si sigue un patrón, y comentarlo con tu médico si continúa o te incomoda.
                  <div style={{ marginTop: '10px', fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>Ejemplo de respuesta para este prototipo — el contenido clínico real de Mindi todavía no está definido.</div>
                </GuidanceCard>
                <TrustPanel>
                  <ReviewedBy name="Nombre del profesional / especialidad" date="Ejemplo de fecha" />
                  <SourceList sources={[{ label: 'Ejemplo de fuente 1' }, { label: 'Ejemplo de fuente 2' }]} />
                </TrustPanel>
              </div>
            );
          }
          const isUser = m.from === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: 'var(--radius-m)', fontSize: 'var(--text-body-m)', lineHeight: 'var(--lh-body)',
                background: isUser ? 'var(--brand-secondary)' : 'var(--surface-card)', color: isUser ? '#fff' : 'var(--text-primary)',
                boxShadow: isUser ? 'none' : 'var(--shadow-card)',
              }}>{m.text}</div>
            </div>
          );
        })}
      </div>
      {stage === 'intro' && messages.length === 1 && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px 20px', flexWrap: 'wrap', flexShrink: 0 }}>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} style={{
              fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', padding: '10px 16px', minHeight: '40px',
              borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>{s}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px 20px', borderTop: '1px solid var(--border-default)', background: 'var(--surface-card)', flexShrink: 0 }}>
        <label htmlFor="ask-mindi-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Escribe tu mensaje</label>
        <input
          id="ask-mindi-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Escribe aquí"
          style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', padding: '12px 16px', minHeight: '44px', borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-default)' }}
        />
        <Button variant="primary" size="m" onClick={() => send()} icon={<Icon name="send" size={16} />}>Enviar</Button>
      </div>
    </div>
  );
}
