# Documentación de VacuPet — índice

Punto de entrada único a toda la documentación. Si acabas de llegar, lee primero
[`../HANDOFF.md`](../HANDOFF.md).

## Empezar aquí
- [`../HANDOFF.md`](../HANDOFF.md) — narrativa de entrega: idea, arquitectura, backlog, decisiones.
- [`../README.md`](../README.md) — cómo correr y mapa del repo.
- [`PENDIENTES.md`](PENDIENTES.md) — **checklist único** de pasos manuales del dueño.

## Dominio (el motor)
- [`ESQUEMA_VACUNAL.md`](ESQUEMA_VACUNAL.md) — esquemas de vacunación por especie/país, reglas
  de rabia y de viaje. Es la lógica más valiosa; conservar intacta.

## Despliegue y publicación
- [`DESPLIEGUE.md`](DESPLIEGUE.md) — backend Supabase + Edge Functions (SQL → claves → `deploy.sh`).
- [`PUBLICAR.md`](PUBLICAR.md) — publicar el front estático (hosting HTTPS).
- [`MOVIL.md`](MOVIL.md) — app Android con Capacitor + RevenueCat.
- [`ACTIVAR_SERVICIOS.md`](ACTIVAR_SERVICIOS.md) — activar login fiable, IA y email.

## Activaciones por feature (pasos manuales)
- [`GOOGLE_WALLET.md`](GOOGLE_WALLET.md) — carné en Google Wallet.
- [`WHATSAPP.md`](WHATSAPP.md) — recordatorios por WhatsApp.
- [`WHITE_LABEL.md`](WHITE_LABEL.md) — producto B2B para clínicas.
- [`PRECIOS_REGIONALES.md`](PRECIOS_REGIONALES.md) — precios por país + trial.

## Monetización
- [`MONETIZACION.md`](MONETIZACION.md) — cimiento freemium, feature flags, entitlements, webhook.

## Seguridad
- [`SECURITY.md`](SECURITY.md) — auditoría de 3 frentes: lo corregido y los follow-ups.

## Legal (borradores — revisar con asesoría antes de publicar)
- [`TERMINOS.md`](TERMINOS.md) · [`PRIVACIDAD.md`](PRIVACIDAD.md) · [`REEMBOLSOS.md`](REEMBOLSOS.md)
- [`REVISION_LEGAL.md`](REVISION_LEGAL.md) — dossier para abogado/a.

## Recursos
- [`email-templates/`](email-templates/) — plantillas de correo con marca (login + bienvenida).

## Archivo
- [`_archivo/`](_archivo/) — documentos históricos superados (planes y snapshots antiguos).
  Se conservan por trazabilidad; **no reflejan el estado actual**. Ver [`_archivo/README.md`](_archivo/README.md).
