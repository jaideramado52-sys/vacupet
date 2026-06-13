# VacuPet

Carné de salud digital para mascotas (PWA de un solo archivo).
Vacunas, **desparasitación**, **peso**, visitas al veterinario y microchip — con esquema
inteligente por **especie**, recordatorios, exportación profesional (PDF/QR de integridad)
y nube opcional (Supabase).

> Inspirado en la arquitectura de **VacunaFam** (carné de vacunas humano), adaptado al
> dominio veterinario. Ver `docs/SPEC.md` para la visión y `docs/ROADMAP.md` para el plan.

## Estructura del proyecto

```
VacuPet/
├─ VacuPet.html            ← la app (todo el front en un archivo)   [Fase 0]
├─ index.html              ← entrada / redirección a la app (conserva el hash)
├─ supabase-config.js      ← configuración (claves públicas + endpoints)
├─ service-worker.js       ← PWA: offline + push
├─ manifest.webmanifest    ← PWA: instalación
├─ icon.svg · icon-maskable.svg · og-image.svg   ← iconos / social   [Fase 2]
├─ _headers                ← cabeceras de hosting (Cloudflare/Netlify)   [Fase 2]
│
├─ deploy.sh               ← despliega los Edge Functions + secrets   [Fase 4]
├─ .env.deploy.example     ← plantilla de secretos (copiar a .env.deploy)
│
├─ scripts/
│   └─ gen-keys.mjs        ← genera claves ES256 (firma) y VAPID (push)   [Fase 4]
│
├─ supabase/
│   ├─ schema.sql          ← tablas + RLS + RPC + bucket (ejecutar en SQL Editor)
│   └─ functions/          ← Edge Functions (Deno)
│       ├─ vacupet-faq/    ← asistente FAQ veterinaria (Claude)
│       ├─ vacupet-ocr/    ← escanear carné veterinario (Claude visión)
│       ├─ vacupet-sign/   ← firma del QR de integridad
│       ├─ vacupet-push/   ← recordatorios push (vacunas + desparasitación)
│       ├─ recordatorios/  ← recordatorios por email
│       └─ eliminar-cuenta/← borrado de cuenta/datos
│
├─ tests/
│   └─ run.mjs             ← suite de tests (node tests/run.mjs)
│
└─ docs/
    ├─ SPEC.md             ← especificación del producto
    ├─ ROADMAP.md          ← plan por fases de todo lo que se va a implementar
    ├─ ESQUEMA_VACUNAL.md  ← dominio veterinario (backbone del motor)
    └─ brief/              ← notas/brief originales
```

> ⚠️ **No muevas los archivos de la raíz** (`VacuPet.html`, `index.html`,
> `supabase-config.js`, `service-worker.js`, `manifest.webmanifest`, iconos, `_headers`):
> la PWA y el despliegue dependen de esas rutas relativas.

## Estado

**Fases 0–9 completas** (ver `docs/ROADMAP.md`). PWA offline funcional; backend opcional
(nube, push/email, IA, firma) que degrada con elegancia. Tests: `node tests/run.mjs` (63 OK).

## Empezar

- **Probar local:** abre `index.html` (o `VacuPet.html`) en el navegador. Funcionará offline;
  el backend (IA, OCR, firma, push) degradará con elegancia si no está desplegado.
- **Activar backend:** sigue `docs/DESPLIEGUE.md` (SQL → claves → `bash deploy.sh`) — disponible en Fase 4.
- **Plan del proyecto:** `docs/ROADMAP.md`.

Registro personal de apoyo — **no reemplaza el carné oficial ni la consulta veterinaria**.
</content>
