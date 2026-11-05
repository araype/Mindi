# Cifrar los contactos antiguos (hallazgo 4)

Desde la Fase 4 el servidor ya guarda cifrados el correo de `leads` y, con este cambio, el nombre, el
correo y el WhatsApp de las listas de espera. Este paso cifra **lo que ya estaba guardado** en texto plano.

Qué se cifra: `leads.contact`, `reports.contact`, `interest_signups` (nombre, correo, WhatsApp) y
`event_signups` (nombre, contacto). La empresa, el cargo y el n.º de colaboradoras de la demo quedan legibles.

## 1. Antes

- SQL `021_cifrar_contactos.sql` corrido (amplía los límites de largo).
- Función `export-lists` desplegada (para poder leer las listas desde el panel después).

## 2. Las claves, en un archivo local (nunca en el chat ni en git)

En la raíz del proyecto, crea el archivo **`.env.migracion`** (queda fuera de git por el patrón `.env*`
del `.gitignore`; puedes comprobarlo con `git check-ignore -v .env.migracion`) con estas tres líneas:

```
SUPABASE_URL=https://brbiohfjvyrgxuqwgnsz.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
LEADS_ENC_KEY=...
```

- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → *Secret keys* → crea una nueva
  (nombre: `migracion-contactos`) y cópiala. Al terminar, bórrala ahí mismo.
- `LEADS_ENC_KEY`: **la misma** que está en Vercel y en Supabase (si no la tienes guardada, no generes una
  nueva: los correos ya cifrados se perderían; avísame).

Ábrelo y guárdalo con un editor; no lo pegues en una terminal compartida ni en el chat.

## 3. Contar (no cambia nada)

```bash
node scripts/cifrar-contactos.mjs
```

Muestra, por tabla y columna, cuántos valores siguen sin cifrar y cuántos ya lo están. Solo números.

## 4. Cifrar (cuando el conteo esté revisado)

```bash
node scripts/cifrar-contactos.mjs --cifrar
node scripts/cifrar-contactos.mjs            # debe dar 0 sin cifrar en todas
```

Se puede repetir sin riesgo (salta lo ya cifrado). Conviene correrlo de nuevo **después del lanzamiento**:
el sitio anterior guarda los contactos sin cifrar hasta ese día.

Si algo saliera mal: `node scripts/cifrar-contactos.mjs --descifrar` vuelve todo a texto plano.

## 5. Al terminar

- Borra `.env.migracion` y la clave secreta `migracion-contactos` en Supabase.
- Comprueba en el panel → Listas que las exportaciones se leen bien.
