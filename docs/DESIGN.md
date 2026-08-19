# Sistema de diseño — VacuPet

Fuente única de verdad para la consistencia de UI/UX. El objetivo es que **la
inconsistencia sea imposible**: valores nombrados + gates en CI (ver §6).

Estado: los tokens de color y las escalas viven en el `:root` de `VacuPet.html`.
Al modularizar (ver `HANDOFF.md` §3), extraer esto a `tokens.css`.

## 1. Color (tokens theme-aware)

Definidos en `:root` y redefinidos para oscuro. **Nunca hardcodear un hex** en UI
normal — usar el token para que el tema funcione.

| Token | Rol |
|-------|-----|
| `--bg` / `--surface` / `--surface-2` | fondos (página / tarjeta / sutil) |
| `--ink` / `--muted` | texto principal / secundario |
| `--accent` / `--on-accent` / `--accent-ink` | marca (teal) y su texto |
| `--line` / `--line-2` | bordes / divisores |
| `--green` / `--amber` / `--red` / `--blue` | semánticos de estado |
| `--shadow` / `--shadow-lg` | sombras |

**Acento por mascota:** el acento se adapta a la especie (`SPECIES_COLOR`); todos
los colores cumplen WCAG AA (≥4.5:1) con texto blanco.

## 2. Escala de espaciado → `--sp-1..6`

`4 · 8 · 12 · 16 · 20 · 24 px`. Todo margen/padding/gap sale de aquí. Los ~15
valores sueltos actuales (1,2,5,6,7,9,10,11,14,18,22…) se redondean a la escala.

## 3. Escala de radio → `--r-sm/md/lg/pill`

`10 · 14 · 18 · 999 px`. (Coexisten con los previos `--radius`/`--radius-sm`;
migrar a los nuevos.)

## 4. Escala tipográfica (7 pasos)

| Paso | px | Uso |
|------|----|----|
| xs | 11 | captions, tags |
| sm | 12.5 | labels, hints |
| base | 13.5 | cuerpo |
| md | 15 | subtítulos |
| lg | 17 | títulos de sección |
| xl | 22 | títulos de vista |
| 2xl | 26 | héroe / cifras |

Un tamaño por rol. Se eliminan los ajustes a medio píxel (9.5/14.5) fuera de esta escala.

## 5. Catálogo de componentes (estados a fijar)

- **Botón** `.btn` + `btn-primary|ghost|danger|block` — hover, active, disabled, loading, focus-visible.
- **Tile** (fila de ajustes) — default, con chevron, con badge, pressed.
- **Chip/tag** — neutro, éxito, aviso, error, seleccionable.
- **Card** — base, `pad`, `empty`, destacada (borde acento).
- **Modal** — cabecera+cierre, footer 1/2 botones, scroll, foco atrapado.
- **Toast** — `success|info|error` (duración y `aria-live` por tipo).
- **Estados de sistema** — vacío (huella punteada), carga (huellitas), error, offline.
- **Feedback** — `successPop`, confeti, sello, háptica: reglas de cuándo cada uno.

## 6. Reglas de interacción (UX)

- Un patrón por intención: registrar → check "pop" + toast; navegar → view transition;
  error → toast rojo que dice cómo resolver.
- Foco visible en todo lo interactivo; trampa de foco en modales.
- Respetar `prefers-reduced-motion` en toda animación.
- Todo estado vacío: ilustración + acción clara. Toda carga: loader de marca.
- Copys desde el lado del usuario; el botón dice qué pasa, el toast confirma en pasado.
- Áreas táctiles ≥ 44px.

## 7. ⚠️ Excepción: superficies de color FIJO (no "arreglar")

Estas superficies usan colores hardcodeados **a propósito** y NO deben migrarse a
tokens theme-aware (romperían su diseño):

- **Modo presentación del carné** (`presentCard`) — fondo blanco fijo, máximo
  contraste para escanear/mostrar; independiente del tema por diseño (tipo boarding-pass).
- **Exportación PDF** (`exportPDF` / `printArea`) — se imprime en papel blanco;
  usa `print-color-adjust`.
- **Tarjeta-imagen compartible** (`shareCardImage`, canvas) — imagen de tamaño fijo
  para WhatsApp/redes, diseño constante.
- **Arte SVG por especie** (`speciesArt`) — ilustración con su propia paleta.

Auditado 2026-08: no hay bug de modo oscuro. Los hex en UI normal ya usan tokens.

## 8. Gates de consistencia (impiden la deriva) — activar en CI

- **Paridad i18n:** ya en `tests/run.mjs` — falla si una clave falta en un idioma.
- **Stylelint:** `.stylelintrc.json` — prohíbe hex/px fuera de escala (activar con `npm install`).
- **Regla de revisión:** cero `style="…"` nuevos; todo estilo es clase/token.
- **Regresión visual:** snapshots de Playwright en claro/oscuro (por añadir al modularizar).
- **Accesibilidad:** axe-core en e2e sobre pantallas clave (por añadir).
- **Checklist de PR:** `.github/PULL_REQUEST_TEMPLATE.md`.
