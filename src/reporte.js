import './ds.css';
import './site.css';
import './reporte.css';

// Página privada de solo lectura del reporte (/reporte?t=<token>): la copia que se comparte con el
// médico (vence a los 30 días) y los enlaces del correo. Se pide a /api/report (servidor), que la
// busca por token, nunca por id: sin el token exacto no devuelve nada. El HTML lo arma send-report,
// que escapa todo lo que escribió la usuaria.

const box = document.getElementById('reportBox');
const token = new URLSearchParams(location.search).get('t');

const EXPIRED = 'Este enlace venció (dura 30 días) o está incompleto. Puedes hacer el test de nuevo para tener un reporte actualizado.';
function fail(msg, cta){
  box.innerHTML = `<h1>No encontramos este reporte</h1><p>${msg}</p>` +
    (cta ? '<p><a class="m-btn" href="/test">Haz el test gratis →</a></p>' : '');
}

async function load(){
  if(!token) return fail(EXPIRED, true);
  try{
    const r = await fetch(`/api/report?t=${encodeURIComponent(token)}`);
    if(r.status === 404) return fail(EXPIRED, true);
    if(!r.ok) return fail('No pudimos cargar tu reporte. Intenta de nuevo en un momento.');
    const { html } = await r.json();
    if(!html) return fail(EXPIRED, true);
    box.innerHTML = html;
  } catch {
    fail('No pudimos cargar tu reporte. Intenta de nuevo en un momento.');
  }
}
load();
