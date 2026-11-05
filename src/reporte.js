import './ds.css';
import './site.css';
import './reporte.css';

// Página privada de solo lectura del reporte (/reporte?t=<token>): la copia que se comparte con el
// médico (vence a los 30 días) y los enlaces del correo. Se pide a /api/report (servidor), que la
// busca por token, nunca por id: sin el token exacto no devuelve nada. El HTML lo arma send-report,
// que escapa todo lo que escribió la usuaria.

const box = document.getElementById('reportBox');
const token = new URLSearchParams(location.search).get('t');

function fail(msg){
  box.innerHTML = `<h1>No encontramos este reporte</h1><p>${msg}</p>`;
}

async function load(){
  if(!token) return fail('Falta el enlace completo. Pide que te lo reenvíen desde Mindi.');
  try{
    const r = await fetch(`/api/report?t=${encodeURIComponent(token)}`);
    if(r.status === 404) return fail('El enlace venció (dura 30 días) o está incompleto.');
    if(!r.ok) return fail('No pudimos cargar tu reporte. Intenta de nuevo en un momento.');
    const { html } = await r.json();
    if(!html) return fail('El enlace venció (dura 30 días) o está incompleto.');
    box.innerHTML = html;
  } catch {
    fail('No pudimos cargar tu reporte. Intenta de nuevo en un momento.');
  }
}
load();
