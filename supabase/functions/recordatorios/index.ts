// VacuPet — Edge Function "recordatorios" (Fase 4 · Recordatorios por email)
// ------------------------------------------------------------------------
// Cron diario: mismos vencimientos que vacupet-push (vacunas + desparasitación)
// pero notificados por EMAIL vía Resend. Antiduplicado con last_notified.
//
// Secrets: RESEND_API_KEY, CRON_SECRET.
//
// TODO (Fase 4): implementar el envío de email con el resumen de pendientes
// por mascota, y proteger con CRON_SECRET.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "recordatorios: no implementado todavía (Fase 4)." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  })
);
