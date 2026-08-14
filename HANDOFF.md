# VacuPet — Dossier de entrega

_Narrativa única para el equipo que continúa el proyecto. Basado en una auditoría del código
real (cifras verificadas en el repo). Última actualización: 2026-08._

**Regla de oro:** lo valioso de VacuPet **no es el código** — es la tesis de producto validada,
el dominio veterinario ya modelado, la investigación de seguridad y las traducciones es/en/pt.
El equipo puede reescribir la capa técnica; lo que no debe rehacer desde cero es ese
conocimiento. Está protegido por 259 pruebas automáticas: son la red de seguridad del refactor.

---

## 1. La idea, en una página

- **El producto:** el carné de salud digital de la mascota (vacunas, desparasitación, peso,
  recordatorios, documentos). Funciona offline, los datos son del dueño, y el veterinario
  puede verificarlos.
- **La cuña (por qué gana):** mercado hispanohablante **sin líder**; la antirrábica es
  obligatoria por ley con certificado en México/Colombia/Brasil; el pain point #1 de todos los
  competidores es **perder o secuestrar los datos**. VacuPet es local-first: lo contrario.
- **Quién paga:** freemium (~2,2 % de conversión real) — anual ~USD 30 con precios regionales;
  y B2B white-label a clínicas (~USD 5-8/mes), que además distribuye y retiene.
- **Qué NO hacer:** nada de telemedicina propia (un competidor quebró con USD 80 M), ni
  wearables (sin APIs), ni **paywall retroactivo** (hundió a la competencia a 2,1★). Menos
  gamificación es más.

El análisis de mercado completo con fuentes se entrega como documento aparte: es el "por qué"
de cada decisión de producto.

## 2. Estado actual

| | |
|---|---|
| En vivo | vacupets.com (PWA) + GitHub Pages, CI verde |
| Pruebas | **259** (239 unitarias + 20 e2e) |
| Idiomas | es / en / pt (~676 claves cada uno) |
| Backend | 10 Edge Functions (Supabase/Deno) |
| Roadmap de producto | 4 fases implementadas |
| Service worker | v11 (tras auditoría de seguridad) |

Funciona hoy: carné multi-mascota offline, recordatorios (push/email/WhatsApp), compartir con
QR verificable, modo presentación, escaneo de carné con IA, chequeo por foto con IA, modo
viajero con reglas legales por país, manada multi-cuidador, sello de clínica, white-label
empaquetado y capa visual completa. **Monetización con scaffolding listo pero apagada**
(`monetize:false`).

## 3. Arquitectura, sin adornos

**Frontend** — un solo archivo `VacuPet.html`: ~4.960 líneas, **326 funciones**, ~4.375 en un
único `<script>`. Vanilla JS, sin framework/módulos/bundler (el "build" solo copia a `dist/`).
Estado en memoria + `localStorage`; UI por plantillas string + `innerHTML`; `render()` completo
en cada cambio. i18n como objetos JS inline.

**Backend** — Supabase: auth, Postgres con RLS, Storage, 10 Edge Functions (Deno/TS). Config por
`supabase/config.toml` + `deploy.sh`; secretos del lado servidor. Pagos vía RevenueCat (nativo) +
Stripe (web), webhook a `vacupet-billing`.

**Empaquetado** — PWA instalable + Capacitor para Android. Widget nativo escrito pero **sin
compilar/verificar** (faltó entorno Android). White-label vía `scripts/make-brand.mjs`.

**Dependencias en runtime (CDN)** — `supabase-js`, `qrcode-generator` y `web-llm` se cargan de
jsdelivr/esm.run **en ejecución**, no empaquetadas.

> **Decisión #1 (solo el dueño):** ¿mantener el enfoque de un solo archivo (rápido de iterar,
> cero build) o refactorizar a módulos + TypeScript + framework ligero (mantenible por varias
> personas, testeable, CSP estricta)? **Recomendación:** para un equipo que va a mantener,
> refactorizar — **conservando la lógica de dominio y las traducciones intactas** (§5). No es un
> rewrite: es extraer lo probado a módulos, migrando hasta que los 259 tests sigan en verde.

## 4. Backlog priorizado (inconsistencias y mejoras)

Prioridad: **P0** bloquea calidad/seguridad/negocio · **P1** importante para producción ·
**P2** mejora/higiene.

| # | Hallazgo | Prioridad |
|---|----------|:---------:|
| 1 | Sin tooling de calidad activado en el monolito (ESLint/Prettier/TS ya **configurados** en el repo — falta aplicarlos al refactorizar). | P0 |
| 2 | Monolito de un archivo (326 funciones en un `<script>`): impide colaboración, revisión y testing unitario real. | P0 |
| 3 | Enforcement premium solo en cliente (flag en `localStorage` editable). Requiere validar el *entitlement* en servidor antes de monetizar. | P0 |
| 4 | Tabla `entitlements` solo en docs, no en `schema.sql`: si se recrea la BD, el premium queda sin RLS. | P0 |
| 5 | Rate limiting ausente en funciones IA (OCR/checkup); solo hay tope de tamaño. | P1 |
| 6 | Dependencias CDN en runtime sin fijar/vendorizar (SRI). | P1 |
| 7 | CSP con `unsafe-inline`/`unsafe-eval` (obligado por el script inline; se endurece con el build). | P1 |
| 8 | Modelo de privacidad ambiguo: el sync sube datos legibles por el servidor y el PIN no cifra el `localStorage`. | P1 |
| 9 | Widget Android sin compilar; flujo Capacitor no verificado end-to-end. | P1 |
| 10 | Documentación: **consolidada en esta entrega** (índice en `docs/README.md`, obsoletos en `docs/_archivo/`). | ✅ |
| 11 | Licencia y propiedad: **añadido `LICENSE`** (propietaria). Falta cerrar el contrato de titularidad. | P1 |
| 12 | i18n manual (objetos JS inline). Migrar a JSON/ICU + verificación de paridad en CI. | P2 |
| 13 | `render()` completo en cada cambio: no escala; un framework con render dirigido lo resuelve. | P2 |
| 14 | Arnés de tests unitarios peculiar (extrae el `<script>` por regex). Modularizar habilita Vitest/Jest. | P2 |
| 15 | Accesibilidad parcial: base decente, falta auditoría WCAG dedicada. | P2 |
| 16 | Residuos: **limpiado** (`_dom.html` eliminado). | ✅ |

Los ítems 3-5 y 8 son los *follow-ups* ya documentados en [`docs/SECURITY.md`](docs/SECURITY.md):
no son sorpresas, es el trabajo que faltaba deliberadamente. La auditoría ya cerró lo crítico
(un XSS explotable en el carné compartido) y endureció cripto/backend.

## 5. Qué conservar intacto

Aunque reescriban la UI, esto es conocimiento ganado que debe migrarse tal cual, protegido por
los tests que ya existen:

- **🧠 Lógica de dominio** — esquemas de vacunación por especie/país, cálculo de próximas
  dosis, reglas de rabia y de viaje (21-30 días, ventanas de certificado por país), edades
  humanas, estados de salud. Lo más difícil de reconstruir y ya probado. Ref:
  [`docs/ESQUEMA_VACUNAL.md`](docs/ESQUEMA_VACUNAL.md).
- **🌐 Traducciones es/en/pt** — ~676 claves × 3 idiomas, revisadas. Migrar a JSON, no reescribir.
- **🎨 Sistema visual** — paleta (teal + acentos AA), logo escudo, iconografía, componentes.
  Traducible a design tokens directamente.
- **🔒 Investigación de seguridad** — [`docs/SECURITY.md`](docs/SECURITY.md): qué se auditó,
  arregló y qué falta. Ahorra repetir el análisis.
- **📊 Análisis de mercado** — competidores, precios, huecos, regulación LATAM, con fuentes.
- **✅ Suite de tests** — 259 pruebas que codifican el comportamiento esperado. La red de
  seguridad del refactor.

## 6. Cómo se entrega (paquete de handoff)

1. **Repositorio Git como fuente de verdad** — limpio, CI verde, 259 tests. Congela una rama
   `handoff/baseline` como punto de partida inmutable.
2. **Brief de producto de 1 página** — §1 + el análisis de mercado. Evita que "pulir" cambie el
   norte del producto.
3. **Este dossier técnico** (`HANDOFF.md`) — que empiecen por los P0.
4. **Lista de decisiones que solo el dueño puede tomar** (§7).
5. **Checklist de accesos y credenciales** — Supabase, dominio, GitHub, Google Play, RevenueCat,
   Stripe, clave de Anthropic, hosting. **Transferir titularidad**, no compartir contraseñas
   personales.
6. **Contrato con propiedad intelectual y licencia** — quién es dueño del código y los datos, y
   qué pueden hacer. Va **antes** de dar acceso.

> ⚠️ **Datos reales:** si ya hay usuarios en producción, no entregues la BD con datos personales
> sin un acuerdo de tratamiento de datos. Da al equipo **staging con datos ficticios** (la app
> tiene modo demo y semillas). Los datos de mascotas incluyen contacto del dueño — son PII.

## 7. Decisiones que solo el dueño puede tomar

| Decisión | Recomendación |
|----------|---------------|
| **Arquitectura** — single-file vs. módulos+TS+framework | Refactor conservando dominio/i18n/tests. |
| **Alcance del encargo** — "pulir y lanzar" vs. "mantener y evolucionar" | Defínelo: cambia toda la inversión en tooling/arquitectura. |
| **Monetización** — precios, trial, mercados | Anual regional + enforcement de servidor antes de encender `monetize`. |
| **Privacidad** — cifrado E2E del sync vs. comunicar que no cifra | Decidir explícitamente; hoy la promesa supera a la implementación. |
| **B2B white-label** — ¿prioritario o secundario? | Si es prioritario, el refactor debe soportar multi-tenant desde el diseño. |
| **Marca y legal** — titularidad, licencia, ToS/privacidad definitivos | Cerrar antes del acceso de terceros. |

## 8. Primeros 30 días (arranque verificable)

**Semana 1-2 · Cimientos**
- Activar el tooling ya configurado (TS, ESLint, Prettier, CI de lint) — `npm install`.
- Extraer lógica de dominio + i18n a módulos, con los 259 tests en verde como red (§5).
- Consolidación de docs **ya hecha**; revisar y adoptar.

**Semana 3-4 · Producción**
- Server enforcement del premium + `entitlements` en `schema.sql` (P0 #3-4).
- Rate limiting en funciones IA; vendorizar dependencias CDN con SRI (P1 #5-6).
- Compilar y verificar el APK + widget Android en un build real (P1 #9).
- Decidir y ejecutar el modelo de privacidad (P1 #8).

**Criterio de aceptación del arranque:** la app sigue pasando los 259 + 20 tests tras el
refactor, la CSP se puede endurecer (sin `unsafe-inline`), y el premium no se desbloquea
editando `localStorage`. Eso demuestra que "pulieron sin romper la base".

---

Ver también: [`docs/README.md`](docs/README.md) (índice de documentación) ·
[`docs/PENDIENTES.md`](docs/PENDIENTES.md) (pasos manuales del dueño) ·
[`docs/SECURITY.md`](docs/SECURITY.md) (auditoría).
