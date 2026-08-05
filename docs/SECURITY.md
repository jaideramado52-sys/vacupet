# Auditoría de seguridad — VacuPet (2026-08)

Auditoría de nivel experto en 3 frentes (cliente XSS/DOM, cripto/auth/sync,
backend/Edge Functions). Este documento lista lo CORREGIDO y los follow-ups
pendientes que requieren cambios de infraestructura o coordinados.

## Corregido en esta tanda (desplegado)

### Cliente
- **CRÍTICO — XSS por foto de carné compartido.** `petFoto()` devolvía `info.foto`
  cruda a `<img src="…">`; un enlace `#v=`/`#s=` malicioso (datos no confiables)
  podía inyectar `foto:'x" onerror=…'` y ejecutar JS en el origen de la app.
  Fix: `safeImgUrl()` (solo `data:image/*` o `http(s)`) + `esc()` en `petFoto`;
  variante `petFotoRaw` para canvas. Verificado en navegador: el payload NO ejecuta.
- **Validación de forma del carné compartido**: `sanitizePet()` recorta el objeto
  no confiable a campos/tipos/longitudes esperados antes de renderizar.
- **esc()** ahora también escapa comilla simple (`'` → `&#39;`).
- **Esquema de URL** validado (`safeLinkUrl`) en href/`window.open` de marca blanca,
  partners y "gestionar suscripción" (bloquea `javascript:`/`data:`).
- **CSP** añadida (defensa en profundidad): `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `script-src`/`img-src` acotados. `connect-src https:` para
  no romper el asistente IA (WebLLM) ni el sync.

### Cripto
- **PBKDF2 150k → 600k** iteraciones (mínimo OWASP 2024). Retrocompatible: cada
  envelope guarda su propio `it`.
- **PIN mínimo 4 → 6 dígitos** (10k → 1M combinaciones).
- **verifyIntegrity**: exige coincidencia de `kid` (ya no cae a la primera clave),
  fija `alg=ES256`, y respeta `exp` si el payload lo lleva.

### Backend
- **Tope de tamaño de imagen** (~5 MB) en `vacupet-ocr` y `vacupet-checkup`: acota
  el coste por llamada de las funciones públicas que usan Anthropic.
- **Oráculo de firma cerrado**: `vacupet-sign` y `vacupet-wallet` pasan a
  `verify_jwt=true` (antes cualquiera en internet firmaba payloads/pases). El
  cliente manda el JWT de sesión.
- **CRON_SECRET obligatorio** (falla cerrado) en `recordatorios`, `vacupet-push`,
  `vacupet-whatsapp`.
- **Higiene**: sin PII en logs (solo status), errores genéricos al cliente en
  billing/eliminar-cuenta, HTML del email de recordatorios escapado.
- **vacupet-faq** retirada del deploy (obsoleta; la FAQ es WebLLM local).

## Verificado correcto (no eran fallos)
- AES-GCM con IV/salt frescos por cifrado, sin reutilización; CSPRNG en toda la cripto.
- Sin alg-confusion (la clave privada de firma no está en el cliente).
- Sin secretos indebidos en el bundle (solo anon/publishable + VAPID pública).
- `eliminar-cuenta` borra por el uid del token verificado (no del body): no borra
  cuentas ajenas. RLS de `vacupet_state`/`shares`/`push_subs`/bucket por `auth.uid()`.
- Sin SSRF (ninguna función hace fetch a URL del cliente). `get_share` filtra por
  UUID inadivinable + expiración.

## Follow-ups pendientes (requieren infra o cambio coordinado)

1. **Rate limiting en ocr/checkup** (coste). El tope de tamaño mitiga, pero un
   atacante puede seguir llamando en bucle. Añadir límite por IP/usuario (tabla con
   ventana o KV) y/o exigir `verify_jwt=true` cuando el cliente mande sesión siempre.
   Considerar `claude-haiku-4-5` para OCR/triaje (más barato) vía `OCR_MODEL`/`CHECKUP_MODEL`.
2. **entitlements en `schema.sql`** (M1). Hoy la tabla + RLS de premium solo viven en
   `docs/MONETIZACION.md`. ANTES de `monetize:true`: llevarlas a `schema.sql`
   idempotente, con RLS `select` de la fila propia y SIN policy de escritura para
   `authenticated` (solo la service role escribe). Confirmar que ocr/checkup/sync
   validan el entitlement en servidor, no el flag local.
3. **Firma atada al usuario** (residual de A2). Con `verify_jwt=true` ya no es un
   oráculo abierto, pero un usuario autenticado aún puede firmar un payload arbitrario.
   Para "verificado = auténtico", firmar solo el estado del carné del propio usuario
   (leído en servidor) e incluir `sub`=uid + `exp` en el payload.
4. **Webhook de facturación** (M3). Con RevenueCat el header-secret es el método
   soportado (ok). Si se migra a Stripe/Lemon Squeezy, implementar verificación HMAC
   real de su firma y chequeo de timestamp (anti-replay).
5. **Modelo de privacidad del sync/PIN** (M2/M3). Hoy el sync sube datos legibles por
   el servidor (protegidos por RLS) y el PIN no cifra el localStorage. Decidir: o
   cifrado E2E con clave derivada del PIN/passphrase (reposo + nube), o dejar explícito
   en la UI que sync/bloqueo no cifran (no prometer más de lo que la cripto entrega).
6. **flowType PKCE** (L1): cambiar `implicit` → `pkce` en la config de Supabase auth.
7. **Minimizar `info` compartido** (L4): el carné compartido incluye microchip y
   veterinario; recortar a lo necesario.
