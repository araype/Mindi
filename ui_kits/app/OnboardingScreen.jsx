function OnboardingScreen({ Button, Input, onDone }) {
  const { useState } = React;
  const [step, setStep] = useState(0);
  const steps = [
    { title: 'Bienvenida a Mindi', body: 'Un espacio cercano para entender lo que estás viviendo, cuando tú quieras.' },
    { title: 'Empecemos con lo básico', form: true },
    { title: 'Tú decides qué compartir', body: 'Puedes elegir qué contarle a Mindi. Siempre queremos que entiendas cómo usamos tu información y puedas ajustar tus preferencias cuando quieras.' },
  ];
  const current = steps[step];
  return (
    <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {steps.map((_, i) => (
          <div key={i} style={{ height: '4px', flex: 1, borderRadius: '2px', background: i <= step ? 'var(--action-primary)' : 'var(--sand-200)' }} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--text-editorial-l)', color: 'var(--text-primary)', lineHeight: 'var(--lh-editorial)' }}>{current.title}</h1>
        {current.body && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body-l)' }}>{current.body}</p>}
        {current.form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input label="¿Cómo te llamamos?" placeholder="Tu nombre" />
            <Input label="Correo (para guardar tu espacio)" placeholder="tucorreo@ejemplo.com" type="email" helperText="Lo usamos solo para que puedas volver a tu cuenta." />
          </div>
        )}
      </div>
      <Button variant="primary" size="l" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : onDone())}>
        {step < steps.length - 1 ? 'Continuar' : 'Empezar'}
      </Button>
    </div>
  );
}
