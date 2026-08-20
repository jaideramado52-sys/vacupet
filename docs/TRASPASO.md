# Guía de traspaso — cuentas, accesos y credenciales

Runbook operativo para entregar VacuPet a otra persona/equipo **sin perder el control ni
exponer secretos**. Complementa a [`ENTREGA_SEGURA.md`](ENTREGA_SEGURA.md) (qué ocultar/rotar).

Principio: **transfiere titularidad o añade como colaboradores; nunca compartas tus
contraseñas personales.** Y rota los secretos que el equipo podrá ver una vez tenga acceso.

---

## 0. Inventario de cuentas del proyecto

| Servicio | Para qué | Identificador |
|----------|----------|---------------|
| **GitHub** | Código + CI + hosting (Pages) | `jaideramado52-sys/vacupet` (público) |
| **Dominio** | vacupets.com | (registrador — confírmalo) |
| **Supabase** | Auth, BD (RLS), Storage, Edge Functions | proyecto `zrcpnuzodxxfipnelrvy` |
| **Google Play Console** | App Android | `com.vacupets.app` |
| **Keystore de firma** | Firma del APK/AAB | `VacuPet-upload.jks` + clave (fuera del repo) |
| **Anthropic** | IA: OCR, chequeo por foto | API key (secret en Supabase) |
| **Resend** | Recordatorios por email | API key (secret en Supabase) |
| **RevenueCat** | Compras in-app (móvil) | cuenta + API keys goog_/appl_ |
| **Stripe** | Checkout web de suscripción | cuenta + `checkoutUrl` |
| **Meta / WhatsApp** *(opcional, sin activar)* | Recordatorios WhatsApp | app Meta + plantilla |
| **Google Wallet** *(opcional, sin activar)* | Carné en Wallet | cuenta de emisor |
| **Netlify** *(legado)* | Hosting anterior | ya migrado a GitHub Pages — dar de baja si no se usa |

> Los **secretos** (claves privadas) NO están en el repo: viven en Supabase → Project
> Settings → Edge Functions → Secrets. Lista completa en `deploy.sh`.

---

## 1. GitHub (código + hosting)

1. Decide: **repo privado** antes de entregar (Settings → Danger Zone → Change visibility),
   o mantenerlo público.
2. Opción A — **transferir el repo** a la cuenta/organización del equipo:
   Settings → Danger Zone → *Transfer ownership*.
3. Opción B — **añadir colaboradores**: Settings → Collaborators → Add people.
4. Si transfieres, revisa que **GitHub Pages** siga activo en el nuevo owner (Settings → Pages)
   y que el dominio `vacupets.com` siga apuntando (el archivo `CNAME` ya está en el repo).
5. El CI (`.github/workflows/ci.yml`) se ejecuta solo con permisos del repo; sin secretos propios.

## 2. Dominio (vacupets.com)

1. Identifica el **registrador** (donde compraste el dominio).
2. Opción A — transferir el dominio a la cuenta del equipo (código de autorización/EPP).
3. Opción B — dar acceso al panel de DNS, o delegar DNS a su proveedor.
4. Verifica que el registro apunte a **GitHub Pages** (o al hosting elegido) tras el cambio.

## 3. Supabase (el backend — lo más importante)

Contiene la BD con datos, la auth y todos los secretos. Dos caminos:

**A) Transferir el proyecto existente** (mantiene datos y config):
1. Supabase → el proyecto vive en una **organización**. Invita al equipo a la org
   (Organization → Team → Invite) con rol Owner/Admin, o transfiere el proyecto a su org.
2. Tras darles acceso, **rota los secretos** (ver §8).

**B) Que el equipo cree su propio proyecto** (arranque limpio, recomendado si no hay usuarios):
1. Nuevo proyecto Supabase del equipo.
2. Ejecutar `supabase/schema.sql` (tablas + RLS + RPC + bucket).
3. Poner sus propios secretos y `bash deploy.sh` (ver `DESPLIEGUE.md`).
4. Actualizar `supabase-config.js` con su `url` + `anonKey` (públicas).
5. **Migrar datos** solo si hay producción y con acuerdo de datos (si no, empezar limpio).

## 4. Google Play Console (Android)

1. **Transferir la app** a otra cuenta de desarrollador (proceso oficial de Google, requiere
   la cuenta destino y a veces tarifa), **o** añadir usuarios: Play Console → Users and
   permissions → Invite, con permisos de la app `com.vacupets.app`.
2. Acordar quién será el **titular de la cuenta de desarrollador** (Google cobra US$25 una vez).

## 5. Keystore de firma Android (¡crítico!)

El `.jks` firma el APK/AAB. **Sin él no se puede actualizar la app** (Google rechaza otra firma).

1. NO va al repo (ya está fuera — mantenlo así).
2. Opciones:
   - **Play App Signing** (recomendado): Google guarda la clave de firma de la app; tú solo
     necesitas la clave de subida (upload), que sí se puede reemplazar si se pierde.
   - **Transferir el keystore**: entrega `VacuPet-upload.jks` + su contraseña por un canal
     seguro (gestor de contraseñas compartido, no email/chat).
3. Guarda una copia de respaldo tú también.

## 6. Anthropic + Resend (secretos server-side)

1. Lo ideal: el equipo usa **sus propias claves** (nueva key de Anthropic, nueva de Resend) y
   las pone como secretos en su Supabase.
2. Si les das las tuyas temporalmente, **rótalas** cuando terminen de configurar (§8).
3. Verifica límites/billing: la key de Anthropic tiene costo por uso (OCR/chequeo).

## 7. RevenueCat + Stripe (pagos)

1. **RevenueCat**: invita al equipo al proyecto (Project → Collaborators) o transfiere; sus
   API keys (`goog_`/`appl_`) van en `supabase-config.js` (son públicas de cliente).
2. **Stripe**: invita como miembro del equipo (Settings → Team) o transfiere la cuenta;
   el `checkoutUrl` y los precios se configuran ahí (ver `PRECIOS_REGIONALES.md`).
3. La cuenta bancaria de cobro debe quedar a nombre de quien recibirá los ingresos.

## 8. Rotar secretos DESPUÉS de dar acceso de deploy

Cuando el equipo tenga acceso a Supabase/deploy, podrán ver los secretos actuales. Rota:

- [ ] `CRON_SECRET`
- [ ] Secreto del webhook de billing (`BILLING_WEBHOOK_SECRET`)
- [ ] `ANTHROPIC_API_KEY` (genera una nueva, revoca la vieja)
- [ ] `RESEND_API_KEY`
- [ ] Claves de RevenueCat si sospechas exposición
- [ ] (Push/firma) `VAPID_*` y `SIGN_PRIVATE_JWK` solo si cambias de proyecto Supabase

Regenerar VAPID/firma: `node scripts/gen-keys.mjs` (ver `DESPLIEGUE.md`).

## 9. Datos de usuarios (si hay producción)

- [ ] **No entregues la BD con datos reales.** Da staging con datos ficticios (modo muestra + semillas).
- [ ] Firma un acuerdo de tratamiento de datos si tocarán datos reales (PII: contacto del dueño).

## 10. Orden recomendado

1. Cerrar contrato + `LICENSE` (titularidad). → `HANDOFF.md` §6.
2. Repo privado (si aplica) + añadir/transferir GitHub.
3. Decidir Supabase: transferir vs. proyecto nuevo del equipo.
4. Play Console + keystore (o Play App Signing).
5. Pagos (RevenueCat/Stripe) + dominio.
6. **Rotar todos los secretos** (§8).
7. Verificar: la app en vivo sigue funcionando, CI verde, y tú ya NO tienes accesos que no debas.

## 11. Verificación final (checklist de cierre)

- [ ] El equipo puede clonar, `npm install`, correr `npm test` (245) y `npm run e2e` (20).
- [ ] El equipo puede desplegar (front vía Pages, backend vía `deploy.sh`).
- [ ] vacupets.com sigue online tras los cambios de dominio/hosting.
- [ ] Secretos rotados; tus claves personales revocadas.
- [ ] Keystore entregado/respaldado por canal seguro.
- [ ] Sin datos personales tuyos en el repo (ya verificado: email removido).
