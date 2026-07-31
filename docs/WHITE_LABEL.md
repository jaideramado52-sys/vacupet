# White-label para clínicas — producto B2B (Fase 4)

La app ya soporta marca blanca completa (nombre, logo, color, tarjeta "Mi
clínica", sello de clínica en vacunas). Este documento la convierte en un
PRODUCTO vendible a clínicas hispanohablantes.

## La oferta (qué compra la clínica)

"El carné digital de tu clínica: tus clientes llevan la app con TU logo y tu
color, con recordatorios automáticos que los hacen volver, y cada vacuna que
aplicas queda sellada con tu nombre."

Incluye:
- App PWA con la marca de la clínica (instalable, funciona offline).
- Sello "✓ Aplicada por [Clínica]" en cada vacuna que registran (verificación nivel 1).
- Recordatorios automáticos (push/email; WhatsApp cuando esté activo) → menos no-shows
  (el 11% de citas se pierden por olvido — AAHA).
- Botones directos: llamar, WhatsApp, agendar cita (bookUrl).
- Datos del dueño, no de la clínica: cero fricción legal de custodia.

## Precio ancla (del análisis de mercado 2026-07)

- Benchmark directo: Guiavet PRO (Brasil) cobra R$20-30/mes por veterinario.
- Propuesta: **USD 5-8/mes por clínica** (o USD 50-80/año), primeras 5 clínicas
  gratis 3 meses a cambio de feedback y testimonio.
- Los competidores US (VitusVet, Vet2Pet ~USD 499/mes bundle) son solo inglés:
  no hay oferta equivalente en español.

## Generar el build de una clínica (2 minutos)

1. Copia `brands/ejemplo.json` → `brands/<clinica>.json` y rellena nombre,
   color, teléfono, WhatsApp y URL de citas. El logo puede ser URL o data-URL.
2. `node scripts/make-brand.mjs brands/<clinica>.json`
3. Sube `dist-brands/<slug>/` a Netlify/Pages, o crea el subdominio
   `<slug>.vacupets.com` apuntando a ese deploy.

El build inyecta `brand.js` (identidad) y renombra el manifest para que la PWA
se instale con el nombre de la clínica. La nube (Supabase) es la misma: los
datos siguen siendo del dueño de la mascota.

## Onboarding de una clínica (checklist)

- [ ] JSON de marca + build + subdominio desplegado
- [ ] Probar: instalar la PWA, registrar vacuna con sello, compartir carné
- [ ] Entregar a la clínica: QR impreso para el mostrador ("Descarga el carné
      digital de tu mascota") — el QR apunta a su subdominio
- [ ] Enseñar el flujo de sello: registrar vacuna → check "Sellar como [Clínica]"
- [ ] Acordar el precio y alta en facturación (Stripe subscription B2B)

## Pitch de 30 segundos (para el correo/WhatsApp a clínicas)

"¿Cuántos clientes pierden una vacuna anual por olvido? VacuPet les da a tus
clientes un carné digital con TU marca que les recuerda cada dosis y los trae
de vuelta a TU clínica. Cada vacuna que aplicas queda sellada con tu nombre.
Se instala desde un QR en tu mostrador. USD X/mes, el primer trimestre gratis."
