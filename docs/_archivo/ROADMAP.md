# VacuPet — Roadmap de implementación

> Plan por fases de **todo lo que se va a implementar**. Estado: 🔲 pendiente · 🚧 en curso · ✅ hecho · ⏳ código listo, requiere desplegar backend.
> Cada fase es entregable por sí sola. Orden pensado para un solo desarrollador.

---

## Fase 0 — MVP personal (offline, sin backend) ✅
Objetivo: una mascota con su carné funcional en `localStorage`. Es la base de todo.
> Verificado: sintaxis JS válida + render headless (Chrome) sin errores de consola.

- [x] Shell PWA de un solo archivo `VacuPet.html` (header, tabbar, vistas).
- [x] **Sistema de diseño**: tokens monocromos + 1 acento, tipografía Inter, modo claro/oscuro, hairlines, radios suaves, iconos SVG (emojis solo como avatar de especie).
- [x] **Perfil de mascota**: nombre, **especie** (perro/gato/conejo/hurón/ave/otro), raza, sexo, nacimiento/adopción, color, microchip, esterilizado (sí/no/no sé), peso, foto, veterinario habitual, notas.
- [x] **Registro de vacunas**: nombre, fecha, dosis, lote, marca, lugar, aplicada por, próxima, vía, notas. Validación de campos.
- [x] **Registro de desparasitación**: tipo (interna/externa), producto, fecha, peso, próxima, notas.
- [x] **Modelo de datos local** `vacupet:data:v1` + función `migrate()` preparada para versiones futuras.
- [x] **Recordatorios locales**: chips de pendientes/vencidas, ventana configurable (`remDays`), banner de próxima (prioriza vencida).
- [x] **Exportar .ics** (calendario) de próximas dosis/desparasitaciones.
- [x] **Exportar PDF** del carné (área imprimible con tablas).
- [x] **Respaldo JSON** (exportar/importar con confirmación) — seed y modo offline.
- [x] **Esquema por edad/especie** básico (`suggestProxima`/`suggestDeworm`: serie cachorro vs. refuerzo anual).

## Fase 1 — Carné pro (sin backend) ✅
Objetivo: convertirlo en un carné serio y multimascota.
> Verificado: sintaxis válida + render headless (normal y compartida) sin errores de consola + 23 pruebas unitarias de lógica (esquema, desparasitación, resumen, gráfico de peso, base64url, i18n).

- [x] **Esquema vacunal por especie** (core / no-core) con metadatos — ver `ESQUEMA_VACUNAL.md`.
- [x] **Motor de esquema** `suggestProxima` / `suggestDeworm`: próxima dosis y puesta al día por edad/intervalo/especie (serie cachorro vs. refuerzo anual). Etiqueta "orientativo".
- [x] **Módulo de peso**: historial + **gráfico de evolución** SVG (curva de peso por fecha) + peso del perfil = último registrado.
- [x] **Multimascota**: carrusel de avatares con mini-anillo de cobertura, resaltar activa, añadir/eliminar/cambiar mascota.
- [x] **Dashboard de cobertura**: % aplicadas/pendientes/vencidas + chips de resumen + banner de próxima dosis (prioriza vencida).
- [x] **Visitas al veterinario**: registro (fecha, motivo, diagnóstico, clínica, notas).
- [x] **Compartir carné** por link/QR (sin backend: payload base64url en el hash + **vista de solo lectura**; QR vía CDN con degradación offline).
- [x] **Fichas por vacuna/enfermedad** (qué previene, para quién, efectos típicos) accesibles con ⓘ.
- [x] **Accesibilidad**: foco visible (`:focus-visible`), roles ARIA (tablist/tab/dialog/status), `aria-label` en iconos, `aria-pressed` en idioma.
- [x] **i18n** es / en / pt con conmutador en el header, persistencia y cambio en vivo (chrome y pantallas; fichas español-primero).

## Fase 2 — PWA real ✅
Objetivo: instalable y offline de verdad.
> Verificado: sintaxis válida + render headless sin errores + manifest JSON válido (2 iconos, maskable, 2 shortcuts) + pruebas de lógica PWA (viewMore, notifSubText, urlB64ToUint8).

- [x] `manifest.webmanifest` afinado: `id`, `display_override`, `shortcuts` (registrar vacuna / ver carné), categorías, iconos any+maskable.
- [x] `service-worker.js`: precache del shell + estrategia network-first (HTML/config) y cache-first (resto) + actualización (`vacupet-v2`).
- [x] `icon.svg` · `icon-maskable.svg` (zona segura) · `og-image.svg` (branding patita verde) + meta Open Graph/Twitter + apple-touch-icon.
- [x] **Instalación** (prompt A2HS): captura `beforeinstallprompt`, tile "Instalar" en Más, `appinstalled`.
- [x] **Web Push local**: permiso de notificaciones + **notificación de prueba** vía service worker; suscripción `pushManager` lista para Fase 4 (si hay clave VAPID).
- [x] **Accesos directos** del manifest (`#tab=`, `#add=`) gestionados al arrancar.
- [x] `_headers` (cabeceras de hosting) + `index.html` de redirección que conserva el hash de enlaces compartidos.

## Fase 3 — Nube y cuentas (Supabase) ✅ (código) → ⏳ (desplegar)
Objetivo: tus mascotas en la nube, multidispositivo, seguras.
> Verificado (cliente): sintaxis válida + render headless en modo local sin errores + 12 pruebas (resolución de conflictos, `cloudConfigured`, UI de cuenta, degradación). El backend real lo despliega el usuario (SQL + claves).

- [x] **Auth** (email/OTP por código, sin redirección) + UI de cuenta en *Más*; modo invitado (solo local) sigue funcionando.
- [x] `supabase/schema.sql`: tablas + **RLS** + RPC `get_share` + bucket privado `mascotas` (del scaffold).
- [x] `vacupet_state` (espejo del JSON) — **sync multidispositivo**: pull al iniciar/login, push con debounce al guardar, resolución de conflictos por `updated_at` (`shouldAdoptRemote`).
- [x] `supabase-config.js` (url + anon key públicas; vacío = modo local).
- [x] **Degradación elegante**: sin config no se carga el cliente ni se muestra la cuenta; todo funciona local.
- [~] **Storage** de fotos: por ahora las fotos viajan dentro de `vacupet_state` (jsonb, comprimidas). El bucket `mascotas` queda listo para mover a Storage dedicado si crecen (optimización futura).
- [ ] **Desplegar**: ejecutar `supabase/schema.sql` y pegar `url`+`anonKey` en `supabase-config.js` (lo hace el usuario).

## Fase 4 — Recordatorios server (email/push programados) ✅ (código) → ⏳ (desplegar)
Objetivo: que el aviso llegue aunque la app esté cerrada.
> Verificado: cliente con sintaxis válida + headless (local y enlace `#s=`) sin errores + 9 pruebas de la lógica de vencimientos de las funciones (`dueItems`/ventana `remDays`). Las funciones Deno se ejecutan al desplegar (no hay runtime Deno local).

- [x] `scripts/gen-keys.mjs`: genera claves **VAPID** (push) y **ES256** (firma QR) — del scaffold.
- [x] Edge Function `vacupet-push`: recorre `vacupet_state`, calcula vencimientos (vacunas + **desparasitación**) dentro de `remDays` y envía Web Push (VAPID vía `web-push`). Antiduplicado `last_pushed`; limpia suscripciones 404/410.
- [x] Edge Function `recordatorios`: mismos vencimientos por **email** (Resend), email del usuario vía Admin API. Antiduplicado `last_notified`.
- [x] Tabla `push_subs` + **suscripción desde el cliente** (`trySubscribePush` hace upsert al iniciar sesión).
- [x] **Compartir por link con permisos**: con sesión crea un `shares` con **token que caduca (30 días)**, enlace `#s=<uuid>` sin datos en la URL; lectura vía RPC `get_share`. Sin sesión, cae al `#v=` (hash).
- [x] `docs/DESPLIEGUE.md` (checklist punta a punta) + `deploy.sh` + `.env.deploy.example` (del scaffold).
- [ ] **Cron diario** y **secrets**: lo configura el usuario al desplegar (SQL `cron.schedule` + `bash deploy.sh`).

## Fase 5 — IA por reglas + asistente ✅ (código) → ⏳ (desplegar IA)
Objetivo: que la app responda "¿qué le falta a mi mascota?".
> Verificado: cliente sintaxis + headless sin errores + 17 pruebas (clasificación de intenciones es/en/pt, motor de reglas, FAQ con/sin endpoint y consentimiento). Las funciones IA requieren `ANTHROPIC_API_KEY` al desplegar.

- [x] **Motor de reglas offline** (en dispositivo, sin enviar datos): "¿qué le falta?", "próxima dosis", "próxima desparasitación", "registrar por chat" (abre el formulario), "explica el recomendador". Clasificador de intenciones es/en/pt.
- [x] **UI de chat** (panel, burbujas, chips, descargo) + lanzadores (**burbuja flotante FAB** + tile en Inicio).
- [x] Edge Function `vacupet-faq`: **FAQ veterinaria** con Claude + disclaimers fuertes; **consentimiento explícito** en el chat antes de enviar a la nube (`data.faqConsent`).
- [x] Edge Function `vacupet-ocr`: **escanear carné** con Claude visión + **salida estructurada** (tool use forzado) → **pantalla de revisión obligatoria** con casillas antes de guardar (`source:"ocr"`).
- [x] **i18n del asistente** (responde en el idioma del usuario; chrome del chat traducido es/en/pt).
- [ ] **Desplegar IA**: configurar `ANTHROPIC_API_KEY` y `OCR_MODEL` (lo hace el usuario; sin esto el asistente funciona en local con reglas y la FAQ/OCR degradan).

## Fase 6 — Exportación profesional y verificación ✅ (código) → ⏳ (desplegar firma)
Objetivo: un carné que un veterinario o aduana pueda confiar.
> Verificado: cliente sintaxis + headless sin errores + **6 pruebas criptográficas** (token válido verifica, payload manipulado/firma corrupta rechazados, extracción del carné firmado). La firma requiere `SIGN_PRIVATE_JWK` al desplegar.

- [x] **PDF clínico veterinario** con datos de la mascota + tablas de vacunas/desparasitación/**peso**/**visitas**.
- [x] **QR de integridad firmado**: `buildIntegrityToken` (JWS/JWT ES256 vía `vacupet-sign`) + verificación en la vista compartida (✓ verificada / ⚠ alterada / integridad no verificable). `verifyIntegrity` con ECDSA P-256 (WebCrypto) contra el JWKS público.
- [x] Edge Function `vacupet-sign`: firma ES256 (`POST {payload}→{token}`) + **JWKS público** (`GET ?jwks=1`).
- [x] **Exportar registro veterinario** en **CSV** (UTF-8 con BOM, legible por clínicas / hojas de cálculo).
- [ ] **Desplegar firma**: generar claves (`gen-keys.mjs`) y configurar `SIGN_PRIVATE_JWK`/`SIGN_KID` (lo hace el usuario; sin esto, los carnés se comparten sin firmar y la vista muestra “integridad no verificable”).

## Fase 7 — Privacidad, seguridad y cuenta ✅ (código) → ⏳ (desplegar borrado)
> Verificado: cliente sintaxis + headless sin errores + **8 pruebas criptográficas** (PIN hasheado/roundtrip/rechazo, respaldo AES-GCM roundtrip/clave incorrecta/sin filtración).

- [x] **Bloqueo con PIN** (PBKDF2-SHA256, comparación en tiempo constante) + **biométrico (WebAuthn)** opcional; pantalla de bloqueo al abrir.
- [x] **Respaldo cifrado** (AES-GCM 256 + PBKDF2) con contraseña: exportar/importar.
- [x] **Centro de privacidad** en *Más*: bloqueo, respaldo cifrado, borrar datos locales, eliminar cuenta.
- [x] Edge Function `eliminar-cuenta`: verifica el JWT del usuario y borra `vacupet_state`/`shares`/`push_subs`/Storage + `auth.admin.deleteUser`.
- [x] `docs/PRIVACIDAD.md` · `docs/TERMINOS.md` (borradores orientativos).
- [ ] **Desplegar**: la eliminación de cuenta real requiere la función desplegada (lo hace el usuario; sin nube, "Borrar mis datos" funciona en local).

## Fase 8 — (opcional) Viajero + crecimiento ✅
> Verificado: cliente sintaxis + headless sin errores + 15 pruebas (requisitos por destino vs. carné: rabia vigente, microchip, desparasitación reciente, trámites; logros).

- [x] **Pasaporte de viaje** (modo viajero): requisitos por destino (microchip ISO, rabia vigente, titulación FAVN/RNATT, desparasitación, certificado) **contrastados con el carné** (✓ cumplido / pendiente / requiere trámite) + descargo.
- [x] **Veterinarias cercanas** (geolocalización → búsqueda en mapa, con fallback si se deniega).
- [x] **Gamificación**: logros por mascota (carné al día, microchip, esquema completo, control de peso).
- [~] **Más países afinados**: 5 destinos base (UE, Reino Unido, EE.UU., países libres de rabia, Latinoamérica). Ampliar al país objetivo es ajuste de datos.
- [ ] **Campañas/recordatorios estacionales**: diferido (se solapa con el sistema de recordatorios; bajo valor por ahora).

## Fase 9 — Calidad / producción ✅
> Verificado: `node tests/run.mjs` → **63 OK, 0 fallos** + headless sin errores.

- [x] **Tests**: suite consolidada `tests/run.mjs` (esquema por especie, recordatorios, gráfico de peso, i18n es/en/pt, base64url, sync/conflictos, asistente, **cripto del QR firmado**, **PIN + respaldo cifrado**, viajero/logros, spec de las Edge Functions).
- [x] **Accesibilidad**: **Texto grande** (zoom 1.15), respeto a `prefers-reduced-motion`, foco visible, roles ARIA, `aria-pressed`/`aria-label` (heredado de fases previas).
- [x] **Pulido PWA**: aviso de **nueva versión** (detección de `updatefound` en el service worker), offline (network-first del shell), iconos/manifest listos.
- [x] **Publicación**: `docs/PUBLICAR.md` (checklist, hosting HTTPS, PWA, SEO/OG, Lighthouse).

---

## ✅ Proyecto completo
**Fases 0–9 implementadas y verificadas.** La PWA funciona offline en local; el backend
(nube, push/email, IA, firma) es opcional y degrada con elegancia. Para activarlo, el usuario
sigue `docs/DESPLIEGUE.md` y `docs/PUBLICAR.md`. Regresión: `node tests/run.mjs`.

## Mejoras adicionales (post-v1) ✅
> `node tests/run.mjs` → **77 OK**. Verificadas con headless + capturas.

- [x] **Rediseño del Inicio — héroe con foto**: foto de la mascota como protagonista, anillo de progreso animado, estado del día sobre la imagen, chips interactivos.
- [x] **Mascota de ejemplo**: botón "Ver ejemplo" + enlace `#demo` (carga "Rocky" con datos completos).
- [x] **Cuidados y recordatorios propios**: baño, uñas, medicación, peluquería, cumpleaños, otro — con frecuencia y próxima fecha; integrados en recordatorios.
- [x] **Personalización visual**: color de acento (6) en vivo + color por especie en el héroe + estados vacíos mejorados.
- [x] **Micro-interacciones**: confeti al desbloquear logros + transiciones entre pestañas (View Transitions); respeta `prefers-reduced-motion`.
- [x] **Álbum y documentos**: galería de fotos con fecha (lightbox) + adjuntar imagen/PDF por mascota (local).

---

## Diferencias clave heredadas de VacunaFam (qué se reutiliza y qué cambia)
| Área | VacunaFam (humano) | VacuPet (mascota) |
|---|---|---|
| Sujeto | Persona (perfil familiar) | Mascota (especie/raza/microchip) |
| Esquema | Por **país** (calendario nacional) | Por **especie** (perro/gato/…); rabia con matiz legal por país |
| Módulos extra | Modo viajero internacional | **Desparasitación**, **peso**, **esterilización**, visitas vet |
| Export clínico | FHIR R4 (Immunization) | **Registro veterinario** estándar (no FHIR humano) |
| Asistente | FAQ salud humana | FAQ veterinaria con disclaimers reforzados |
| Reutilizable casi igual | Auth, RLS, sync, push, QR firmado, PDF, respaldo cifrado, PWA, i18n, compartir por link |

## Pendiente / decisiones abiertas
- [ ] Confirmar **especies v1** (perro+gato seguro; conejo/hurón como genérico).
- [ ] Confirmar **país objetivo** del esquema/legalidad de rabia (demo: Guatemala).
- [ ] Definir branding/iconografía (paleta y mascota del logo).
- [ ] Modelo de monetización (define si/cuándo entran pagos).
</content>
