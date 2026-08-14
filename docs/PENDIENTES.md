# Pendientes del dueño — checklist único

Todo lo que **solo el dueño** puede hacer (accesos, cuentas de terceros, decisiones), reunido
en un solo lugar. Cada punto enlaza a su guía detallada. Marca a medida que avanzas.

## 🔴 Antes de encender la monetización

- [ ] **Enforcement de servidor del premium.** Hoy el gating es de cliente (editable). Validar el
      *entitlement* en las Edge Functions antes de `monetize:true`. Ver [`SECURITY.md`](SECURITY.md) §2.
- [ ] **`entitlements` en `schema.sql`.** La tabla + RLS solo viven en [`MONETIZACION.md`](MONETIZACION.md);
      versionarlas idempotentes con RLS (sin escritura para `authenticated`). Ver [`SECURITY.md`](SECURITY.md).
- [ ] **Play Console:** crear suscripción `premium` (planes anual con trial de 14 días + mensual)
      y precios por país. Guía: [`PRECIOS_REGIONALES.md`](PRECIOS_REGIONALES.md).
- [ ] **Stripe:** Prices anual/mensual con `trial_period_days`.
- [ ] **`supabase-config.js`:** rellenar `prices` y `trialDays` para que el paywall los muestre.
- [ ] **Legal:** revisar [`TERMINOS.md`](TERMINOS.md), [`PRIVACIDAD.md`](PRIVACIDAD.md) y
      [`REEMBOLSOS.md`](REEMBOLSOS.md) con asesoría del país objetivo. No lanzar con usuarios sin esto.

## 🟠 Desplegar los cambios de backend (seguridad)

Los fixes de las Edge Functions viven en el repo pero **requieren desplegar**:

- [ ] Configurar `CRON_SECRET` (ahora es **obligatorio**: las funciones de cron fallan sin él).
- [ ] `bash deploy.sh` (despliega funciones + secrets). Ver [`DESPLIEGUE.md`](DESPLIEGUE.md).
- [ ] Borrar la función obsoleta: `supabase functions delete vacupet-faq`.

## 🟡 Móvil (Android)

- [ ] Compilar el APK/AAB: `npm run cap:android` — estrena el **widget nativo "próxima dosis"**
      (escrito pero nunca compilado). Ver [`MOVIL.md`](MOVIL.md).
- [ ] Regenerar los iconos mipmap de Android con el logo escudo antes del build de tienda.

## 🟢 Activaciones opcionales por feature

- [ ] **Google Wallet:** cuenta de emisor + service account + secrets + `walletEndpoint`.
      Guía: [`GOOGLE_WALLET.md`](GOOGLE_WALLET.md).
- [ ] **WhatsApp:** app de Meta + plantilla aprobada + `ALTER TABLE vacupet_state ADD COLUMN last_wa date`
      + secrets + cron. Guía: [`WHATSAPP.md`](WHATSAPP.md).
- [ ] **White-label B2B:** vender a clínicas; generar builds con `scripts/make-brand.mjs`.
      Guía: [`WHITE_LABEL.md`](WHITE_LABEL.md).

## 🔵 Follow-ups de seguridad (recomendados)

De [`SECURITY.md`](SECURITY.md) — endurecimiento no bloqueante:

- [ ] Rate limiting en las funciones de IA (OCR/checkup).
- [ ] Vendorizar/fijar dependencias CDN con SRI.
- [ ] Decidir el modelo de privacidad: cifrado E2E del sync/PIN vs. comunicar que no cifra.
- [ ] Cambiar `flowType` de `implicit` a `pkce` en la config de Supabase auth.

## ⚫ Handoff al equipo (si aplica)

Ver [`../HANDOFF.md`](../HANDOFF.md) §6-7:

- [ ] Congelar rama `handoff/baseline`.
- [ ] Transferir titularidad de cuentas (no compartir contraseñas personales).
- [ ] Cerrar contrato de propiedad intelectual y licencia.
- [ ] Entregar staging con datos ficticios (no la BD con PII).
