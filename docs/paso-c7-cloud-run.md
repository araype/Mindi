# Paso C.7 · Cloud Run privado (listo para ejecutar)

Datos reales (revisados el 5 nov. 2026):

- Proyecto de Google Cloud: `beefocus-476502` (número 647713663993)
- Servicio: `mindi-agent`, región `us-central1`
- Hoy: `roles/run.invoker` para `allUsers` (público). No existe todavía una cuenta para la web.
- El sitio en producción (`mindi-beta.vercel.app`) **no llama al agente** (se construyó con el chat
  apagado): cerrar Cloud Run no lo afecta. Solo la vista previa (`mindi-rediseno.vercel.app`) lo usa.

Orden: primero la credencial en Vercel y probarla; **recién después** cerrar el acceso público.

```bash
gcloud config set project beefocus-476502

# 1. Cuenta de servicio solo para la web, con permiso de invocar únicamente este servicio
gcloud iam service-accounts create mindi-web --display-name="Mindi web (Vercel)"
gcloud run services add-iam-policy-binding mindi-agent --region=us-central1 \
  --member="serviceAccount:mindi-web@beefocus-476502.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# 2. Su clave JSON (fuera de la carpeta del proyecto, para que nunca llegue a git)
gcloud iam service-accounts keys create "$HOME/mindi-web-sa-key.json" \
  --iam-account=mindi-web@beefocus-476502.iam.gserviceaccount.com

# 3. Cargarla en Vercel (Preview y Production) y borrar el archivo
npx vercel env add GCP_SA_KEY preview    < "$HOME/mindi-web-sa-key.json"
npx vercel env add GCP_SA_KEY production < "$HOME/mindi-web-sa-key.json"
rm "$HOME/mindi-web-sa-key.json"

# 4. Volver a desplegar la vista previa (sin --prod) y apuntar el alias
npx vercel deploy                       # anota la URL que imprime
npx vercel alias set <URL> mindi-rediseno.vercel.app

# 5. Probar el chat en https://mindi-rediseno.vercel.app/chat (con créditos en OpenAI).
#    Debe responder. Si no, NO sigas: revisa GCP_SA_KEY.

# 6. Cerrar el acceso público
gcloud run services remove-iam-policy-binding mindi-agent --region=us-central1 \
  --member="allUsers" --role="roles/run.invoker"

# 7. Comprobar
curl -s -o /dev/null -w "%{http_code}\n" https://mindi-agent-647713663993.us-central1.run.app/list-apps   # debe ser 403
#    y el chat de la vista previa debe seguir respondiendo.
```

**Si algo sale mal** (vuelve a ser público mientras se revisa):

```bash
gcloud run services add-iam-policy-binding mindi-agent --region=us-central1 \
  --member="allUsers" --role="roles/run.invoker"
```

Notas:

- Si el paso 2 falla con *"Key creation is not allowed"*, la organización bloquea las claves
  (`iam.disableServiceAccountKeyCreation`): hay que usar Workload Identity Federation con el OIDC de
  Vercel en vez de la clave (avísame y lo preparo).
- La clave no vence sola. Para rotarla: crear una nueva (paso 2), cargarla (paso 3), desplegar, y borrar
  la anterior con `gcloud iam service-accounts keys delete <ID> --iam-account=mindi-web@…`.
- Con el servicio cerrado, el archivo `/docs` del ADK y las rutas de sesiones dejan de ser públicas
  (hallazgo 1 de la revisión de seguridad).
