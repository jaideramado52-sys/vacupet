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

## Bloque 2 — Profundidad clínica  ⏳ (siguiente)

Lo que diferencia VacuPet de "una libreta de notas".

- [ ] **Medicamentos / tratamientos crónicos** — dosis, horario y recordatorio
  recurrente (no solo vacunas/desparasitación). Reutiliza el motor de
  recordatorios (push/email/.ics). Para displasia, diabetes, epilepsia…
- [ ] **Historial de visitas enriquecido** — motivo, diagnóstico, peso de ese día
  y adjuntar foto de receta/análisis (ya hay OCR + álbum).
- [ ] **Esquema vacunal por país/normativa** — parametrizar `SCHEME` (hoy GT) para
  respetar calendarios locales; el viaje internacional ya existe.
- [ ] **Línea de tiempo unificada** — vacunas + desparasitación + peso + visitas +
  medicación en una sola vista cronológica.

## Bloque 3 — Robustez "pro" / técnica  ⏳

- [ ] **CI/CD** — GitHub Actions: tests + build + deploy automático en cada push
  (hoy el deploy es manual).
- [ ] **Tests E2E (Playwright)** — login, sync, alta de mascota y tarjeta de
  emergencia en navegador real, además de la suite de lógica (86 tests).
- [ ] **Recordatorios más confiables** — fallback con Notification Triggers /
  Periodic Background Sync + "centro de recordatorios" auditable.
- [ ] **Telemetría de errores** anónima (Sentry o propia) para fallos en producción.
- [ ] **Migración de datos versionada** — formalizar `migrate()` por versión de esquema.
- [ ] **Accesibilidad AA** — foco visible, lectores de pantalla en modales,
  contraste del teal en estados.

---

### Notas de implementación (Bloque 1)
- Modelo: `data.owner = { nombre, telefono, altNombre, altTelefono }`;
  `pet.info.pesoMin` / `pesoMax`. `migrate()` inicializa `data.owner = {}`.
- i18n completo es/en/pt para todas las claves nuevas (`owner_*`, `wt_*`, `emerg_*`).
- Demo (`loadDemoPet`) trae dueño y objetivo de peso de Rocky para visualizar.
