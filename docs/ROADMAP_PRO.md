# VacuPet — Roadmap "Pro"

Plan de evolución de VacuPet de PWA sólida a producto profesional. Tres bloques,
priorizados por impacto / esfuerzo. Estado al 2026-06-19.

---

## Bloque 1 — Quick wins de producto  ✅ (entregado)

Máximo impacto reutilizando la infraestructura existente.

- [x] **PDF como hoja de emergencia** — el carné en PDF ahora incluye grupo
  sanguíneo, **alergias** (resaltadas), condiciones crónicas y los contactos del
  dueño. La ficha impresa sirve como hoja de emergencia real.
- [x] **Dueño + contacto alternativo** — datos del dueño (nombre/teléfono) y un
  segundo cuidador, guardados a nivel de app (`data.owner`). Editables en
  *Más › Dueño y contactos* (`ownerModal`).
- [x] **Contactos en la tarjeta de emergencia** — "Si me encuentras, contacta a:"
  con botones **Llamar** (`tel:`) al dueño y al contacto alternativo.
- [x] **Peso con objetivo y alerta** — rango ideal (mín/máx) por mascota; la
  sección Peso muestra un aviso (verde "en su peso ideal" / ámbar
  "por debajo/encima"). Lógica pura `weightStatus()` con 7 tests.
- [x] **Link de solo lectura por mascota** — ya existía (QR firmado ES256 +
  `viewShared`). Mantener.

## Bloque 2 — Profundidad clínica  ✅ (entregado, salvo esquema por país)

Lo que diferencia VacuPet de "una libreta de notas".

- [x] **Medicamentos / tratamientos crónicos** — `pet.meds` con nombre, dosis, vía,
  frecuencia (diaria/cada N días/Nº veces), hora, inicio/fin y próxima dosis.
  Sección propia en *Salud*, estado activo/finalizado, e integrado al motor de
  recordatorios (`reminders()` kind `medicación`). Modal `medModal`.
- [x] **Historial de visitas enriquecido** — la visita ahora guarda **peso de ese
  día** y permite **adjuntar foto** de receta/análisis (reutiliza `compressImage`).
  La fila muestra el peso y un clip si hay adjunto.
- [x] **Línea de tiempo unificada** — `buildTimeline()` (puro) fusiona vacunas +
  desparasitación + peso + visitas + medicación + cuidados en orden cronológico;
  se abre como modal desde *Salud* (`timelineModal`).
- [ ] **Esquema vacunal por país/normativa** — parametrizar `SCHEME` (hoy GT) para
  respetar calendarios locales. (Pendiente: mayor reestructuración de datos.)

## Bloque 3 — Robustez "pro" / técnica  ✅ (entregado, salvo recordatorios-triggers)

- [x] **CI/CD** — GitHub Actions (`.github/workflows/ci.yml`): `test` (suite de
  lógica) → `e2e` (Playwright) → `deploy` a Pages. El deploy **solo corre si los
  tests y el E2E pasan** (gate por verde). Pages cambiado a fuente "GitHub Actions".
- [x] **Tests E2E (Playwright)** — `tests/e2e/smoke.spec.js`: arranque + siembra del
  demo, Salud con Medicación, línea de tiempo y tarjeta de emergencia. Config con
  `webServer` propio. 4 specs verdes.
- [x] **Telemetría de errores** anónima y **local** (sin red): anillo de 20 errores
  en `localStorage` (`window.onerror` + `unhandledrejection`), con vista *Más ›
  Diagnóstico* para copiar/limpiar.
- [x] **Migración de datos versionada** — `SCHEMA_VERSION` + `migrate()` por pasos
  idempotentes (corrigió un bug real de TDZ en el arranque). 6 tests.
- [x] **Accesibilidad AA** — `:focus-visible` en inputs, Escape cierra modales, foco
  al abrir diálogo, `role=tab`/`aria-selected` en pestañas, `prefers-reduced-motion`.
- [ ] **Recordatorios más confiables** — Notification Triggers / Periodic Background
  Sync + centro de recordatorios auditable. (Pendiente: APIs experimentales.)

---

### Notas de implementación (Bloque 1)
- Modelo: `data.owner = { nombre, telefono, altNombre, altTelefono }`;
  `pet.info.pesoMin` / `pesoMax`. `migrate()` inicializa `data.owner = {}`.
- i18n completo es/en/pt para todas las claves nuevas (`owner_*`, `wt_*`, `emerg_*`).
- Demo (`loadDemoPet`) trae dueño y objetivo de peso de Rocky para visualizar.
