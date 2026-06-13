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

## Fase 4 — Recordatorios server (email/push programados) 🔲 → ⏳
Objetivo: que el aviso llegue aunque la app esté cerrada.

- [ ] `scripts/gen-keys.mjs`: genera claves **VAPID** (push) y **ES256** (firma QR).
- [ ] Edge Function `vacupet-push`: recorre `vacupet_state`, calcula vencimientos (vacunas + **desparasitación** + antipulgas) y envía Web Push. Antiduplicado `last_pushed`.
- [ ] Edge Function `recordatorios`: mismos vencimientos por **email** (Resend). Antiduplicado `last_notified`.
- [ ] Tabla `push_subs` + suscripción desde el cliente.
- [ ] **Cron** (Supabase Scheduled / pg_cron) diario.
- [ ] **Compartir por link con permisos** (token que caduca, vía RPC, sin datos en la URL).
- [ ] `deploy.sh` + `.env.deploy.example` + `docs/DESPLIEGUE.md` (checklist punta a punta).

## Fase 5 — IA por reglas + asistente 🔲 → ⏳
Objetivo: que la app responda "¿qué le falta a mi mascota?".

- [ ] **Motor de reglas offline** (en dispositivo, sin enviar datos): "¿qué le falta?", "próxima dosis", "próxima desparasitación", "registrar por chat" (prellena formulario), "explica el recomendador".
- [ ] **UI de chat** (panel, burbujas, chips, descargo) + lanzadores (tile + burbuja flotante).
- [ ] Edge Function `vacupet-faq`: **FAQ veterinaria general** con Claude + **disclaimers fuertes** ("no reemplaza al veterinario; nunca da dosis ni diagnósticos"). Consentimiento explícito.
- [ ] Edge Function `vacupet-ocr`: **escanear carné veterinario** con Claude visión + structured outputs → pantalla de revisión obligatoria antes de guardar (`source:"ocr"`).
- [ ] **i18n del asistente** (responde en el idioma del usuario).

## Fase 6 — Exportación profesional y verificación 🔲 → ⏳
Objetivo: un carné que un veterinario o aduana pueda confiar.

- [ ] **PDF clínico veterinario** con datos de la mascota + tablas de vacunas/desparasitación/peso.
- [ ] **QR de integridad firmado** (`buildIntegrityToken` ES256 + verificación en la vista compartida: ✓ verificada / ⚠ alterada). Verificador `verifyIntegrity` (ECDSA P-256, WebCrypto).
- [ ] Edge Function `vacupet-sign` (firma ES256 + JWKS público).
- [ ] **Exportar registro veterinario estándar** (JSON/CSV legible por clínicas; no FHIR humano).

## Fase 7 — Privacidad, seguridad y cuenta 🔲 → ⏳
- [ ] **Bloqueo con PIN** + **biométrico (WebAuthn)** opcional al abrir.
- [ ] **Respaldo cifrado** (AES-GCM + PBKDF2) con passphrase.
- [ ] **Centro de privacidad**: bloqueo, respaldo cifrado, avisos push, consentimientos, exportar/borrar.
- [ ] Edge Function `eliminar-cuenta` (borrado de cuenta + datos + fotos).
- [ ] `docs/PRIVACIDAD.md` · `docs/TERMINOS.md`.

## Fase 8 — (opcional) Viajero + crecimiento 🔲
- [ ] **Pasaporte de viaje**: requisitos por destino (certificado de rabia, titulación FAVN/RNATT para UE/países libres de rabia, microchip ISO) y contraste con el carné.
- [ ] **Veterinarias / urgencias cercanas** (geolocalización).
- [ ] **Más países afinados** (legalidad de rabia, nombres comerciales de vacunas).
- [ ] **Campañas/recordatorios estacionales** (antipulgas en verano, leishmania en zona endémica).
- [ ] **Gamificación** (logros por carné al día) — opcional.

## Fase 9 — Calidad / producción 🔲
- [ ] **Tests**: motor de esquema por especie, i18n, crypto del QR.
- [ ] **Accesibilidad** (modo dueño mayor, lector de pantalla).
- [ ] **Pulido PWA** (Lighthouse, offline, actualización).
- [ ] **Publicación**: `docs/PUBLICAR.md`, hosting, dominio, OG.

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
