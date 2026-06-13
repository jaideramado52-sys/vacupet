# PUBLICAR — VacuPet

Guía para poner VacuPet en producción. La app es **estática** (un solo HTML + PWA),
así que se publica en cualquier hosting con **HTTPS**.

## 1. Antes de publicar (checklist de calidad)
- [ ] `node tests/run.mjs` → 0 fallos (suite de lógica: esquema, i18n, cripto, sync, viajero…).
- [ ] Abrir la app y revisar en claro/oscuro, es/en/pt, y con **Texto grande** activado.
- [ ] Probar offline (apagar red tras la primera carga): la app debe seguir abriendo.
- [ ] Revisar `docs/PRIVACIDAD.md` y `docs/TERMINOS.md` (completar responsable/contacto).
- [ ] (Si usas backend) seguir `docs/DESPLIEGUE.md` completo.

## 2. Archivos que se suben (raíz)
`VacuPet.html`, `index.html`, `supabase-config.js`, `service-worker.js`,
`manifest.webmanifest`, `icon.svg`, `icon-maskable.svg`, `og-image.svg`, `_headers`.

> No subir `docs/`, `tests/`, `scripts/`, `supabase/` ni `.env.deploy` (no hacen falta en el hosting).

## 3. Hosting recomendado (gratis, HTTPS)
### Cloudflare Pages / Netlify
1. Conecta el repositorio (o arrastra la carpeta).
2. **Build command:** _(ninguno)_ · **Output dir:** la raíz del proyecto.
3. El archivo `_headers` ya configura el cacheo correcto (SW y config sin caché).

### Alternativa rápida (sin repo)
- `npx serve` para probar en local con servidor real (necesario para instalar/probar push).
- Vercel: `vercel deploy` sobre la carpeta estática.

## 4. PWA / instalación
- Servida por HTTPS, Chrome/Edge ofrecen **Instalar**; iOS: *Compartir → Añadir a inicio*.
- Los iconos (`icon.svg` / `icon-maskable.svg`) y el `manifest` ya están listos.
- **Actualizaciones:** al subir una versión nueva, el service worker la detecta y la app
  muestra el aviso “nueva versión disponible” (recargar). Sube el número de `CACHE` en
  `service-worker.js` cuando cambies el shell.

## 5. SEO / compartir social
- `og-image.svg` + meta Open Graph/Twitter ya incluidos. Ajusta `og:url`/dominio si quieres.
- Si tu hosting no sirve SVG como imagen social, exporta `og-image` a PNG 1200×630 y enlázalo.

## 6. Dominio
- Apunta tu dominio al hosting (CNAME). Recuerda que **push e instalación requieren HTTPS**.

## 7. Lighthouse (objetivo)
- PWA instalable ✓, offline ✓, manifest válido ✓.
- Accesibilidad: foco visible, roles ARIA, `Texto grande`, respeto a `prefers-reduced-motion`.
- Rendimiento: un solo archivo, sin frameworks; las únicas cargas externas (QR, Supabase, IA)
  son **bajo demanda** y degradan si fallan.

## 8. Post-publicación
- Programa el **cron** de recordatorios (ver `docs/DESPLIEGUE.md`).
- Verifica el flujo real: login → sync entre dos dispositivos → compartir con token → push/email.
