<!-- El contrato de consistencia. Ningún PR se fusiona sin esto + los gates de CI. -->

## Qué cambia
<!-- Resumen breve del cambio y por qué. -->

## Checklist de consistencia (obligatorio)

### Diseño (ver docs/DESIGN.md)
- [ ] Usa **tokens** de color; sin hex crudos en UI normal.
- [ ] Espaciado/radio/tipografía dentro de la **escala** (`--sp-*`, `--r-*`, pasos de tipo).
- [ ] **Cero `style="…"` nuevos** — todo estilo es clase/utilidad del sistema.
- [ ] Se ve bien en **claro y oscuro**.

### UX
- [ ] Estados cubiertos: **vacío / carga / error** donde aplique.
- [ ] Feedback correcto (toast/`successPop`) y copys desde el lado del usuario.
- [ ] **Foco visible** en lo interactivo; respeta `prefers-reduced-motion`.
- [ ] Áreas táctiles ≥ 44px.

### i18n y calidad
- [ ] Claves nuevas en **los 3 idiomas** (es/en/pt) — el test de paridad pasa.
- [ ] `npm test` (unitarias) y `npm run e2e` en verde.
- [ ] `npm run lint` sin errores nuevos.
- [ ] Sin secretos ni datos personales en el diff.

### Verificación
<!-- Cómo lo probaste: capturas claro/oscuro, pasos, etc. -->
