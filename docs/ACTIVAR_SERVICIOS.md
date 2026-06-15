# ACTIVAR SERVICIOS — VacuPet (login fiable + IA + email)

Tu backend ya está conectado (proyecto Supabase `zrcpnuzodxxfipnelrvy`, funciones desplegadas,
claves VAPID/firma puestas, **cron diario programado**). Faltan 3 activaciones que dependen de
cuentas externas. Aquí está el paso a paso exacto.

> Para fijar secrets usas la CLI ya logueada:
> `supabase secrets set CLAVE=valor --project-ref zrcpnuzodxxfipnelrvy`

---

## 1. Login por email FIABLE (SMTP propio) — recomendado
El correo del código de acceso (OTP) sale por el SMTP gratuito de Supabase, que está **muy
limitado** (pocos correos/hora, a veces no llega). Para producción, configura SMTP propio.

**Opción fácil con Resend (gratis):**
1. Crea cuenta en [resend.com](https://resend.com).
2. (Recomendado) **Verifica tu dominio** en Resend → Domains. Sin dominio verificado, Resend
   solo entrega a tu propio correo (suficiente para pruebas).
3. Crea una **API key** en Resend (Settings → API Keys). Empieza por `re_...`.
4. En **Supabase → Authentication → Emails → SMTP Settings** → activa *Custom SMTP*:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** tu API key de Resend (`re_...`)
   - **Sender email:** `no-reply@TU-DOMINIO` (o el de pruebas si no verificaste dominio)
   - **Sender name:** `VacuPet`
5. Guarda. Prueba el login en la app: el código debería llegar al instante.

> Alternativa: en *Authentication → Rate Limits* puedes subir un poco el límite, pero el SMTP
> propio es la solución real.

---

## 2. Escanear carné con IA — OCR (Anthropic)
> La **FAQ del asistente ya NO usa la nube**: corre con un **LLM local en el navegador**
> (WebLLM), privado y sin clave. Solo el **OCR** (leer una foto del carné) usa Claude.

1. Saca una API key en [console.anthropic.com](https://console.anthropic.com) (`sk-ant-...`).
2. Fíjala como secret:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref zrcpnuzodxxfipnelrvy
   ```
   (`OCR_MODEL` ya está en `claude-opus-4-8`.)
3. Listo — la función `vacupet-ocr` ya está desplegada. No hay que redeployar.
   _(Sin esta clave, el OCR degrada con elegancia; el resto del asistente funciona local.)_

---

## 3. Recordatorios por EMAIL (Resend)
El **push** ya funciona (claves VAPID puestas + cron). Para el recordatorio por **correo**:
1. Usa la misma API key de Resend del paso 1 (`re_...`).
2. Fíjala:
   ```bash
   supabase secrets set RESEND_API_KEY=re_... RESEND_FROM="VacuPet <no-reply@TU-DOMINIO>" --project-ref zrcpnuzodxxfipnelrvy
   ```
   Sin dominio verificado, usa `RESEND_FROM="VacuPet <onboarding@resend.dev>"` (solo te llega a ti).
3. El cron ya está programado (envía a diario). Para probar ya mismo:
   ```bash
   curl -X POST "https://zrcpnuzodxxfipnelrvy.supabase.co/functions/v1/recordatorios" -H "x-cron-secret: <CRON_SECRET de tu .env.deploy>"
   ```

---

## Estado actual del backend
| Servicio | Estado |
|---|---|
| Tablas + RLS + RPC + bucket | ✅ Creado |
| 6 Edge Functions | ✅ Desplegadas |
| Firma del QR (VAPID/ES256) | ✅ Activo |
| Cron diario (push 7:00 / email 7:05 GT) | ✅ Programado |
| Login OTP | ⚠️ Funciona con límites → configura SMTP (paso 1) |
| Asistente IA / OCR | ⛔ Falta `ANTHROPIC_API_KEY` (paso 2) |
| Email de recordatorios | ⛔ Falta `RESEND_API_KEY` (paso 3) |

> Tras fijar secrets nuevos, **no** hace falta redeployar las funciones ni el frontend.
> Los secrets se aplican en la siguiente invocación.
