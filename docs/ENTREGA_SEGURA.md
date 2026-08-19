# Entrega segura — qué ocultar / transferir antes del handoff

Auditoría del repo (2026-08). Resumen: **no hay secretos reales en el código ni en el
historial de git**. Los secretos viven en Supabase (server-side), fuera del repo. Aun así,
hay elementos que atan el proyecto a TUS cuentas y deben transferirse, no compartirse.

## ✅ Ya seguro (verificado)
- **Sin claves privadas en el repo:** ANTHROPIC_API_KEY, SIGN_PRIVATE_JWK, VAPID_PRIVATE,
  WA_TOKEN, WALLET_SA_JSON, CRON_SECRET y el secreto del webhook viven en Supabase secrets.
- **Sin `.env` con secretos:** solo `.env.deploy.example` (plantilla vacía).
- **Sin keystore de firma** en el repo (el `.jks` y la clave están fuera — mantenlo así).
- **Historial de git limpio:** los "secretos" que aparecen en docs son placeholders
  (`sk-ant-...`, `VAPID_PRIVATE_KEY=...`), no claves reales.
- **`anonKey` de Supabase es pública por diseño** (`sb_publishable_...`); la seguridad la da RLS.
- **Dato personal removido:** el email `kolopor2015@gmail.com` (cuenta showcase) se eliminó del código.

## 🔧 Revisar/limpiar antes de entregar
- [ ] Confirmar que el commit que elimina el email personal está desplegado.
- [ ] Los datos del dueño en la muestra ("Ana López", "+502 5555…") son ficticios — OK, dejar.
- [ ] Si alguna vez pegaste una clave real en un commit local sin pushear, revísalo antes de dar acceso.

## 🔑 Transferir por titularidad (NO compartir tus contraseñas)
Estas cuentas atan el proyecto a ti. Transfiere la propiedad o crea cuentas nuevas del equipo:

| Recurso | Acción |
|---------|--------|
| **Proyecto Supabase** (`zrcpnuzodxxfipnelrvy`) | Transferir a la org del equipo, o que creen el suyo y repunten `supabase-config.js`. |
| **Dominio** vacupets.com | Transferir el dominio o dar acceso al registrador. |
| **GitHub** (repo) | Añadir al equipo como colaboradores / transferir el repo. |
| **Google Play Console** | Transferir la app o añadir usuarios con permisos. |
| **RevenueCat / Stripe** | Cuentas de facturación: transferir o invitar. |
| **Clave de Anthropic** | Usar una clave del equipo; rota la tuya tras el handoff. |
| **Keystore de firma Android** (`.jks` + clave) | NO va al repo. Decide: transferir el keystore, o migrar a Play App Signing. Es la identidad de la app: perderlo impide actualizarla. |

## 🔄 Rotar tras dar acceso de deploy
Cuando el equipo tenga acceso a Supabase/deploy, rota lo que ellos podrían ver:
- [ ] `CRON_SECRET`, secreto del webhook de billing.
- [ ] Considera rotar la clave de Anthropic y las de RevenueCat.

## 🗄️ Datos de usuarios (si ya hay producción)
- [ ] **No entregues la base de datos con datos reales.** Da **staging con datos ficticios**
      (la app tiene modo muestra y semillas). Los datos de mascotas incluyen contacto del dueño = PII.
- [ ] Firma un acuerdo de tratamiento de datos si el equipo tocará datos reales.
