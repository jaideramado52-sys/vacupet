// VacuPet — Edge Function "vacupet-push" (Fase 4 · Recordatorios push)
// ------------------------------------------------------------------------
// Cron diario: recorre vacupet_state, calcula vencimientos próximos
// (VACUNAS + DESPARASITACIÓN interna/externa + antipulgas) dentro de la
// ventana remDays de cada usuario, y envía Web Push (VAPID) a sus push_subs.
// Antiduplicado con la columna last_pushed (un push por día como máximo).
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
//
// TODO (Fase 4): implementar el cálculo de vencimientos (mismo motor que el
// cliente) + envío Web Push, y proteger con CRON_SECRET.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "vacupet-push: no implementado todavía (Fase 4)." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  })
);
