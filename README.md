# VacuPet

**El carné de salud digital de tu mascota** — vacunas, desparasitación, peso, visitas y
documentos, con esquema inteligente por especie/país, recordatorios, carné compartible y
verificable, y nube opcional. Funciona offline y **los datos son del dueño**.

- **En producción:** https://vacupets.com (PWA) · Android vía Google Play (Capacitor)
- **Idiomas:** español · inglés · portugués
- **Licencia:** propietaria — ver [`LICENSE`](LICENSE)

> 📦 **¿Vas a trabajar en el proyecto o recibirlo?** Empieza por **[`HANDOFF.md`](HANDOFF.md)**:
> la narrativa completa (idea, arquitectura, qué conservar, backlog priorizado y decisiones).

---

## Empezar en 2 minutos

```bash
npm install            # tooling (lint/format/tests e2e)
npm run serve          # sirve la app en http://127.0.0.1:8080
npm test               # 259 pruebas unitarias (node, sin navegador)
npm run e2e            # 20 pruebas end-to-end (Playwright/Chromium)
```

La app es **estática**: también puedes abrir `VacuPet.html` directo en el navegador. El
backend (nube, IA, push) **degrada con elegancia** — si no está desplegado, la app sigue
funcionando en local.

## Mapa del repositorio

```
VacuPet/
├─ VacuPet.html            ← la app completa (front en un solo archivo)
├─ index.html              ← entrada / redirección (conserva el hash de enlaces compartidos)
├─ supabase-config.js      ← configuración pública (claves anon + endpoints + feature flags)
├─ service-worker.js       ← PWA: offline + push
├─ manifest.webmanifest    ← PWA: instalación
├─ icon*.svg · og-image*   ← iconos y previsualización social (logo escudo)
├─ _headers · netlify.toml ← cabeceras/hosting
│
├─ deploy.sh               ← despliega Edge Functions + secrets a Supabase
├─ scripts/                ← generación de claves · build de marca blanca
├─ brands/                 ← configs de white-label por clínica (make-brand.mjs)
│
├─ supabase/
│   ├─ config.toml         ← auth por función (verify_jwt)
│   ├─ schema.sql          ← tablas + RLS + RPC + bucket
│   └─ functions/          ← 10 Edge Functions (Deno/TS)
│
├─ android/                ← proyecto Capacitor (Google Play) + widget nativo
├─ tests/                  ← run.mjs (unitarias) · e2e/ (Playwright)
│
├─ HANDOFF.md              ← ★ narrativa de entrega para el equipo
├─ LICENSE                 ← propietaria
└─ docs/                   ← ver docs/README.md (índice)
```

> ⚠️ **No muevas los archivos de la raíz** (`VacuPet.html`, `index.html`,
> `supabase-config.js`, `service-worker.js`, `manifest.webmanifest`, iconos, `_headers`):
> la PWA y el despliegue dependen de esas rutas relativas.

## Documentación

Todo está indexado en **[`docs/README.md`](docs/README.md)**. Los imprescindibles:

| Para… | Lee |
|-------|-----|
| Entender el proyecto y recibirlo | [`HANDOFF.md`](HANDOFF.md) |
| El dominio veterinario (motor de recordatorios) | [`docs/ESQUEMA_VACUNAL.md`](docs/ESQUEMA_VACUNAL.md) |
| Desplegar el backend | [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) |
| Estado y follow-ups de seguridad | [`docs/SECURITY.md`](docs/SECURITY.md) |
| Pasos manuales pendientes del dueño | [`docs/PENDIENTES.md`](docs/PENDIENTES.md) |

## Arquitectura en una frase

Front vanilla-JS de un solo archivo (PWA, offline-first, `localStorage`) + backend Supabase
(auth, Postgres con RLS, Storage, Edge Functions en Deno) + Capacitor para Android. Sin
framework ni build de bundling hoy — ver [`HANDOFF.md`](HANDOFF.md) §3 para la verdad técnica
y la ruta de modularización recomendada.

---

Registro personal de apoyo — **no reemplaza el carné oficial ni la consulta veterinaria**.
