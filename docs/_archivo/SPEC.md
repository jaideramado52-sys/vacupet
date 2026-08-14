# SPEC — VacuPet (Plataforma, prototipo → producción)

> Estado: v1 (visión inicial) · Ruta elegida: **evolución pragmática solo-dev**, prototipo con arquitectura lista para datos reales.
> Inspirado en la arquitectura de **VacunaFam** (carné de vacunas humano), adaptado al dominio veterinario.
> Base objetivo: `VacuPet.html` — PWA de un solo archivo.

## 1. Visión
Carné de salud digital para mascotas: vacunas, **desparasitación interna/externa**, peso, visitas al veterinario y microchip — con esquema inteligente por **especie**, recordatorios reales y sincronización en la nube. Fácil para dueños, serio con los datos.

**Diferencia clave vs. VacunaFam:** el sujeto no es una persona sino una **mascota** (perro/gato/otros), el esquema es **por especie** (no por país), y se añaden módulos propios del mundo animal: **desparasitación**, **control de peso**, **esterilización/microchip** y **pasaporte de viaje** (certificado de rabia + titulación de anticuerpos).

## 2. Decisión de arquitectura
- **Front:** **PWA instalable** de un solo archivo (`VacuPet.html`) — web + Android + iOS con un solo código. Offline-first.
- **Backend:** **Supabase** (Postgres + Auth + Row Level Security + Storage + Edge Functions). Cuentas, cifrado en reposo (AES-256), TLS, sync y storage de fotos del carné "de fábrica". Prototipo rápido, production-ready.
- **Notificaciones:** Web Push (PWA) + email (Resend/Supabase). SMS/WhatsApp diferidos.
- **IA:** recomendador **por reglas** sobre el esquema vacunal por especie (sin ML). LLM opcional solo para FAQ informativa veterinaria, con **disclaimers fuertes** ("no reemplaza la consulta veterinaria").
- **NO ahora:** microservicios, GraphQL, Kubernetes, telemedicina, marketplace. Monolito + Postgres gestionado.

## 3. Triaje del alcance (qué se integra y qué no)
**Integrar (producto personal):**
- Perfiles de mascota (especie, raza, sexo, nacimiento/adopción, color, microchip, esterilizado, foto).
- Registro de **vacunas** + **desparasitaciones** (interna/externa) + **peso** + **visitas vet**.
- Esquema inteligente **por especie** (cachorro/adulto), refuerzos e intervalos.
- Recordatorios locales (.ics) y push; dashboard de cobertura (% + gráficos).
- Compartir carné por link/QR; PWA + push; cuentas + nube + seguridad (Supabase).
- Asistente híbrido (reglas en dispositivo + FAQ con LLM opcional).

**Diferir:**
- Geolocalización de veterinarias/clínicas cercanas y urgencias 24 h.
- Pasaporte de viaje internacional (rabia + titulación FAVN/RNATT para UE/países libres de rabia).
- Multimascota avanzado (familias con muchos animales, refugios pequeños).
- Predicción de incumplimiento; campañas/brotes locales; gamificación.
- SMS/WhatsApp; pagos/suscripción.

**Descartar / otro producto (B2B/vet, track aparte):**
- Software de gestión de clínicas (historia clínica completa, facturación, inventario de fármacos, agenda multi-doctor).
- Integraciones con laboratorios, ERP veterinario, registros oficiales de microchip (AIPA/ICAR) — requieren convenios.
- Microservicios/GraphQL/K8s/Data Warehouse (sobre-ingeniería).

## 4. Estado por fases (resumen — detalle en SEGUIMIENTO.md)
- **Fase 0 — MVP personal:** perfiles de mascota, ficha, registro de vacunas/desparasitación, recordatorios locales, .ics, PDF, respaldo JSON, validación, esquema por edad/especie.
- **Fase 1 — Carné pro (sin backend):** esquema por especie + categorías (core/no-core), módulo de peso con gráfico, dashboard de cobertura, compartir link/QR, accesibilidad.
- **Fase 2 — PWA:** instalable, offline real (service worker), Web Push local.
- **Fase 3 — Nube y cuentas (Supabase):** auth, sync multidispositivo, RLS, storage para foto del carné.
- **Fase 4 — Recordatorios server:** email/push programados (vacunas + desparasitación + antipulgas); compartir por link con permisos.
- **Fase 5 — IA por reglas:** recomendador de pendientes / esquema incompleto por especie; FAQ informativa veterinaria con disclaimers.
- **Fase 6 — (opcional) Viajero + crecimiento:** pasaporte de viaje, veterinarias cercanas, gamificación.

## 5. Modelo de datos (evolución)
**Hoy (local):** `localStorage` clave `vacupet:data:v1`:
```
{
  activeId,
  remDays,                      // ventana de recordatorio (días)
  pets: [ Mascota {
    info: { id, nombre, especie, raza, sexo, nacimiento, adopcion, color,
            microchip, esterilizado, peso, foto_url, veterinario, notas },
    vaccines:   [ Vacuna  { id, nombre, fecha, dosis, lote, marca, lugar,
                            aplicada_por, proxima, via, notas, source } ],
    dewormings: [ Desparasitacion { id, tipo[interna|externa], producto,
                            fecha, peso, proxima, notas } ],
    weights:    [ Peso    { id, fecha, kg } ],
    vetVisits:  [ Visita  { id, fecha, motivo, diagnostico, clinica, notas } ]
  }]
}
```
El JSON local sigue siendo respaldo/seed y el modo offline.

**Fase 3 (nube, Postgres/Supabase):**
```
usuarios          (auth.users de Supabase)
vacupet_state     (user_id PK, data jsonb, last_notified, last_pushed, updated_at)   -- sync espejo del JSON
mascotas          (id, user_id FK, nombre, especie, raza, sexo, nacimiento, microchip, esterilizado, foto_url, ...)   RLS: user_id = auth.uid()
vacunas           (id, mascota_id FK, nombre, fecha, dosis, lote, marca, lugar, aplicada_por, proxima, via, notas, foto_url)
desparasitaciones (id, mascota_id FK, tipo, producto, fecha, peso, proxima, notas)
pesos             (id, mascota_id FK, fecha, kg)
visitas           (id, mascota_id FK, fecha, motivo, diagnostico, clinica, notas)
esquema_especie   (especie, vacuna, dosis_n, edad_semanas, refuerzo_meses, categoria[core|noncore], pais_obligatoria)
shares            (id, user_id, data jsonb, expires_at, created_at)   -- compartir por link
push_subs         (endpoint PK, user_id, sub jsonb, lang)
```

## 6. Dominio veterinario (esquema vacunal — backbone del motor)
Ver `docs/ESQUEMA_VACUNAL.md` para el detalle. Resumen:

**Perro (core / esenciales):** Moquillo (distemper), Parvovirus, Hepatitis (adenovirus), Parainfluenza — habitualmente combinadas (polivalente: quíntuple/séxtuple/óctuple) — y **Rabia**.
**Perro (no-core / según riesgo):** Leptospirosis, Bordetella (tos de las perreras), Coronavirus canino, Leishmania, Giardia.
**Gato (core):** Trivalente felina / FVRCP (Panleucopenia, Rinotraqueitis/Herpesvirus, Calicivirus) y **Rabia**.
**Gato (no-core):** Leucemia felina (FeLV), Clamidia, PIF.

**Desparasitación:** interna (cada 3 meses adulto; más frecuente en cachorros) y externa/antipulgas-garrapatas (mensual o según producto).
**Calendario tipo cachorro/gatito:** inicio ~6–8 semanas, refuerzos cada 3–4 semanas hasta las ~16 semanas; rabia a las 12–16 semanas; refuerzos anuales.

> ⚠️ El esquema es **orientativo**. La pauta real la define el veterinario según especie, edad, región y riesgo. Rabia: su obligatoriedad legal varía por país.

## 7. Seguridad y datos sensibles
- TLS (hosting) + cifrado en reposo del proveedor + **RLS** (cada dueño ve solo sus mascotas).
- Consentimiento explícito + descargo "**no reemplaza el carné oficial ni la consulta veterinaria**".
- Bloqueo con PIN/biométrico opcional; respaldo cifrado (AES-GCM + PBKDF2).
- Datos de mascota = baja sensibilidad legal (no son datos personales de salud humana), pero se trata el email/cuenta del dueño con cuidado (RGPD-like).

## 8. No-objetivos (de esta ruta)
- No software de gestión de clínica veterinaria (B2B).
- No telemedicina ni diagnóstico clínico ("chat veterinario" solo da información general con disclaimers, nunca dosis ni diagnósticos).
- No integraciones que dependan de convenios (registros oficiales de microchip, labs).
- No microservicios ni Kubernetes.

## 9. Riesgos / decisiones abiertas
- **Especies soportadas v1:** perro y gato seguro; conejo/hurón/otros como "genérico" inicialmente.
- **País(es) objetivo** para la legalidad de rabia y nombres comerciales de vacunas (el demo usará Guatemala + base genérica).
- Modelo de monetización (define si/cuándo entran pagos).
- Alcance del "chat informativo" vs. responsabilidad legal veterinaria.
</content>
</invoke>
