# DESPLIEGUE — VacuPet (backend Supabase + Edge Functions)

Checklist para pasar de "código listo" a "funcionando de verdad". La app **degrada con
elegancia**: sin esto, sigue funcionando en local (sin nube, sin push por servidor).

## 0. Requisitos
- Cuenta en [Supabase](https://supabase.com) y un proyecto creado.
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.
- Node 18+ (para `scripts/gen-keys.mjs`).
- (Opcional) Cuenta en [Resend](https://resend.com) para recordatorios por email.
- (Opcional) Cuenta en [Anthropic](https://console.anthropic.com) para el asistente IA (Fase 5).

## 1. Base de datos (tablas + RLS)
En Supabase → **SQL Editor**, pega y ejecuta **todo** `supabase/schema.sql`.
Crea: `vacupet_state`, `shares` (+ RPC `get_share`), `push_subs`, `esquema_especie`,
el bucket privado `mascotas` y todas las políticas RLS. Es idempotente (se puede repetir).

## 2. Conectar la app a tu proyecto
En **Project Settings → API** copia *Project URL* y *anon public*, y pégalos en
`supabase-config.js`:
```js
window.VACUPET_SUPABASE = { url: "https://TU-REF.supabase.co", anonKey: "eyJ..." };
```
> La anon key es pública por diseño; la seguridad la da el RLS. Con esto ya funcionan
> **cuenta, login (OTP por email) y sincronización multidispositivo**.

## 3. Claves para push y firma
```bash
node scripts/gen-keys.mjs
```
Imprime los comandos `supabase secrets set ...` con tus claves **VAPID** (push) y **ES256**
(firma del QR, Fase 6). Guárdalas; no las subas al repo.
Pega la **clave pública VAPID** en `supabase-config.js`:
```js
// dentro de window.VACUPET_AI:
vapidPublicKey: "B...la-que-imprimió-gen-keys..."
```

## 4. Secrets y despliegue de funciones
```bash
cp .env.deploy.example .env.deploy   # y rellena tus valores
supabase login
supabase link --project-ref TU-REF
bash deploy.sh                        # despliega funciones + configura secrets
```
`deploy.sh` despliega: `vacupet-faq`, `vacupet-ocr`, `vacupet-sign` (públicas) y
`vacupet-push`, `recordatorios`, `eliminar-cuenta` (backend).

## 5. Cron diario (recordatorios)
En Supabase → **Database → Cron** (o `pg_cron`), programa una vez al día:

```sql
-- Push (Web Push). Cambia TU-REF y, si usas CRON_SECRET, añádelo en la cabecera.
select cron.schedule('vacupet-push-diario', '0 13 * * *', $$
  select net.http_post(
    url := 'https://TU-REF.supabase.co/functions/v1/vacupet-push',
    headers := jsonb_build_object('x-cron-secret','EL-VALOR-DE-CRON_SECRET')
  );
$$);

-- Email (Resend)
select cron.schedule('vacupet-email-diario', '5 13 * * *', $$
  select net.http_post(
    url := 'https://TU-REF.supabase.co/functions/v1/recordatorios',
    headers := jsonb_build_object('x-cron-secret','EL-VALOR-DE-CRON_SECRET')
  );
$$);
```
> `vacupet-push` y `recordatorios` usan `SUPABASE_SERVICE_ROLE_KEY` (inyectada por Supabase),
> revisan `vacupet_state` y evitan duplicados con `last_pushed` / `last_notified` (una tanda
> por día). Si pusiste `CRON_SECRET`, las funciones lo exigen en `x-cron-secret`.

## 6. Verificación punta a punta
- [ ] **Login**: en *Más → Cuenta y nube → Iniciar sesión*, recibe el código por email y entra.
- [ ] **Sync**: crea una vacuna; entra desde otro dispositivo/navegador con la misma cuenta y aparece.
- [ ] **Compartir con token**: *Más → Compartir carné* genera un enlace `#s=...`; ábrelo en incógnito (solo lectura) y comprueba que caduca a los 30 días.
- [ ] **Push**: activa avisos (concede permiso) estando con sesión → debe crearse fila en `push_subs`. Invoca `vacupet-push` manualmente (`curl` con el secret) y verifica que llega la notificación.
- [ ] **Email**: invoca `recordatorios` y revisa la bandeja.

```bash
# Disparo manual de prueba (sustituye TU-REF y el secret)
curl -X POST "https://TU-REF.supabase.co/functions/v1/vacupet-push" -H "x-cron-secret: SECRET"
curl -X POST "https://TU-REF.supabase.co/functions/v1/recordatorios" -H "x-cron-secret: SECRET"
```

## 7. Notas
- **Email "from"**: para producción, verifica tu dominio en Resend y ajusta `RESEND_FROM`.
  El remitente de pruebas `onboarding@resend.dev` solo entrega a tu propia cuenta.
- **Hosting de la PWA**: cualquier estático con HTTPS (Cloudflare Pages, Netlify, Vercel).
  El push y la instalación requieren HTTPS (o `localhost`).
- **Borrado de cuenta**: la función `eliminar-cuenta` (Fase 7) borra datos + push_subs + usuario.
