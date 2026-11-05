// Tema elegido a mano (claro/oscuro), antes de pintar para que no parpadee. Sin elección: el del sistema.
// Va en un archivo aparte (no en línea) para que la política de seguridad (CSP) no tenga que permitir scripts en línea.
try { var t = localStorage.getItem('mindi_panel_theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
