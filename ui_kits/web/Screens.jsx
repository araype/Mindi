import React from 'react';

/** Pantallas del flujo real (handoff 10): test, resultado, aviso y chat con IA. Solo para mostrar
    cómo se combinan los componentes; los textos vienen del sitio (src/main.js y _shared/mrs.js). */
export function Phone({ children, dark }) {
  return (
    <div style={{ width: 300, height: 600, borderRadius: 34, overflow: 'hidden', border: '8px solid var(--plum)',
      background: dark ? 'var(--chat-bg)' : 'var(--test-bg)', boxShadow: 'var(--shadow-phone)', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

export function TestScreen() {
  const { Chat, Bubble, Scale } = window.MindiDesignSystem_ef6b32;
  return (
    <Phone>
      <Chat status="Pregunta 1 de 11">
        <Bubble example="Por ejemplo: oleadas de calor en la cara, el cuello o el pecho.">¿Qué tanto te han molestado los bochornos, la sudoración o los calores repentinos?</Bubble>
        <Scale labels={['No los noto', 'Los noto, pero sigo mi día', 'Me interrumpen un poco', 'Me cuesta seguir lo que hacía', 'Paro todo hasta que pasan']} />
        <Bubble from="me">3 · Me cuesta seguir lo que hacía</Bubble>
      </Chat>
    </Phone>
  );
}

export function ResultScreen() {
  const { Card, Chip, AreaBar, Button } = window.MindiDesignSystem_ef6b32;
  return (
    <Phone>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card title="Tus síntomas hoy">
          <Chip sev>Conviene evaluarlo con tu médico · Guía HNHU</Chip>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <AreaBar label="Cuerpo" pct={56} /><AreaBar label="Ánimo" pct={44} /><AreaBar label="Vida íntima" pct={17} />
          </div>
        </Card>
        <Button block>Descargar PDF</Button>
        <Button block variant="outline">Compartir con mi médico</Button>
      </div>
    </Phone>
  );
}

export function AlertScreen() {
  const { Notice } = window.MindiDesignSystem_ef6b32;
  return (
    <Phone>
      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <Notice kind="emergency" title="No estás sola en esto">Marcaste algo que conviene revisar cuanto antes. Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, acude a emergencias o llama al 106 (SAMU).</Notice>
        <Notice kind="eval" title="No estás sola en esto">Marcaste algo que vale la pena conversar con tu médico antes de considerar cualquier tratamiento.</Notice>
      </div>
    </Phone>
  );
}

export function AiChatScreen() {
  const { Chat, Bubble, Button } = window.MindiDesignSystem_ef6b32;
  return (
    <Phone dark>
      <Chat dark status="en línea">
        <Bubble dark>Cuéntame tu duda sobre la perimenopausia o la menopausia.</Bubble>
        <Bubble dark from="me">¿Es normal tener bochornos a los 47?</Bubble>
        <Bubble dark>Son frecuentes en esta etapa. Para saber cuánto te están afectando, te recomiendo hacer el test. Son 11 preguntas y al final tienes un reporte para llevar a tu médico.</Bubble>
        <div><Button>Haz el test de 5 min →</Button></div>
      </Chat>
    </Phone>
  );
}
