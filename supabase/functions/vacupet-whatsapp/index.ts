// VacuPet — Edge Function "vacupet-whatsapp" (Fase 3 · Recordatorios por WhatsApp)
// ---------------------------------------------------------------------------
// Cron diario: mismos vencimientos que "recordatorios" (email) pero enviados
// por WhatsApp Cloud API a los usuarios que activaron el opt-in en la app
// (state.waOptIn) y tienen teléfono con código de país (state.owner.telefono).
//
// Requiere una PLANTILLA aprobada en Meta con 1 parámetro de texto (el resumen),
// p. ej. "recordatorio_vacupet": "🐾 Recordatorio de VacuPet: {{1}}".
//
// Secrets:
//   WA_TOKEN      token permanente de la app de Meta (System User)
//   WA_PHONE_ID   phone number ID del remitente
//   WA_TEMPLATE   nombre de la plantilla aprobada (por defecto "recordatorio_vacupet")
//   CRON_SECRET   (opcional, igual que las demás)
//
// Antiduplicado: columna last_wa en vacupet_state (ver docs/WHATSAPP.md para el ALTER).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN     = Deno.env.get("WA_TOKEN") || "";
const WA_PHONE_ID  = Deno.env.get("WA_PHONE_ID") || "";
const WA_TEMPLATE  = Deno.env.get("WA_TEMPLATE") || "recordatorio_vacupet";
const CRON_SECRET  = Deno.env.get("CRON_SECRET") || "";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function daysBetween(aISO: string, bISO: string): number {
  return Math.round((Date.parse(bISO + "T00:00:00Z") - Date.parse(aISO + "T00:00:00Z")) / 86400000);
}
function dueItems(state: any): { nombre: string; fecha: string; mascota: string }[] {
  const today = todayISO();
  const remDays = typeof state?.remDays === "number" ? state.remDays : 30;
  const items: { nombre: string; fecha: string; mascota: string }[] = [];
  for (const pet of (state?.pets || [])) {
    const mascota = pet?.info?.nombre || "Mascota";
    for (const v of (pet?.vaccines || []))
      if (v?.proxima && daysBetween(today, v.proxima) <= remDays) items.push({ nombre: v.nombre, fecha: v.proxima, mascota });
    for (const d of (pet?.dewormings || []))
      if (d?.proxima && daysBetween(today, d.proxima) <= remDays)
        items.push({ nombre: d.producto || (d.tipo === "externa" ? "Antipulgas" : "Desparasitación"), fecha: d.proxima, mascota });
  }
  return items;
}
// Plantilla de 1 parámetro: los saltos de línea no están permitidos en params.
function resumen(items: { nombre: string; fecha: string; mascota: string }[]): string {
  return items.slice(0, 4).map((i) => `${i.mascota}: ${i.nombre} (${i.fecha})`).join(" · ").slice(0, 900);
}
const LANG: Record<string, string> = { es: "es", en: "en_US", pt: "pt_BR" };

Deno.serve(async (req) => {
  if (!CRON_SECRET) return new Response("misconfigured: CRON_SECRET requerido", { status: 500 });
  {
    const url = new URL(req.url);
    const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (provided !== CRON_SECRET) return new Response("forbidden", { status: 403 });
  }
  if (!WA_TOKEN || !WA_PHONE_ID) return new Response(JSON.stringify({ error: "whatsapp_not_configured" }), { status: 503 });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = todayISO();
  const { data: states, error } = await supa.from("vacupet_state").select("user_id, data, last_wa");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const row of (states || [])) {
    const st = row.data || {};
    if (!st.waOptIn) continue;
    if (row.last_wa === today) continue;
    const tel = String(st.owner?.telefono || "").replace(/[^0-9]/g, "");
    if (tel.length < 8) continue;
    const items = dueItems(st);
    if (!items.length) continue;

    const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: tel,
        type: "template",
        template: {
          name: WA_TEMPLATE,
          language: { code: LANG[st.lang] || "es" },
          components: [{ type: "body", parameters: [{ type: "text", text: resumen(items) }] }],
        },
      }),
    });
    if (r.ok) {
      await supa.from("vacupet_state").update({ last_wa: today }).eq("user_id", row.user_id);
      sent++;
    } else {
      console.error("WA error status:", r.status);
    }
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
});
