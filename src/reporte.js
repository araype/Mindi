import './landing.css';

// Página pública de solo lectura para el reporte, usada cuando la usuaria dejó
// un número en vez de un correo (no hay API oficial de WhatsApp para enviarlo
// directo, así que se le ofrece este enlace privado + un botón a wa.me).
// Accede por token, nunca por id: sin el token exacto, el RPC no devuelve nada.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const box = document.getElementById('reportBox');
const token = new URLSearchParams(location.search).get('t');

function fail(msg){
  box.innerHTML = `<h1>No encontramos este reporte</h1><p>${msg}</p>`;
}

async function load(){
  if(!token) return fail('Falta el enlace completo. Pide que te lo reenvíen desde Mindi.');
  if(!SUPABASE_URL || !SUPABASE_KEY) return fail('El sitio todavía no está configurado para mostrar reportes.');
  try{
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_report_by_token`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
      body:JSON.stringify({p_token:token}),
    });
    if(!r.ok) return fail('El enlace puede haber vencido o estar incompleto.');
    const rows = await r.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if(!row) return fail('El enlace puede haber vencido o estar incompleto.');
    box.innerHTML = row.html;
  } catch {
    fail('No pudimos cargar tu reporte. Intenta de nuevo en un momento.');
  }
}
load();
