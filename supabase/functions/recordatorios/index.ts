// VacuPet — Edge Function "recordatorios" (Fase 4 · Recordatorios por email)
// ------------------------------------------------------------------------
// Cron diario: mismos vencimientos que vacupet-push (vacunas + desparasitación)
// pero notificados por EMAIL vía Resend. Antiduplicado con last_notified.
//
// Secrets:
//   RESEND_API_KEY              (de https://resend.com)
//   RESEND_FROM   (opcional)    remitente verificado, ej. "VacuPet <hola@tudominio>"
//   CRON_SECRET   (opcional)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM    = Deno.env.get("RESEND_FROM")    || "VacuPet <onboarding@resend.dev>";
const CRON_SECRET    = Deno.env.get("CRON_SECRET")    || "";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z"), b = Date.parse(bISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}
function dueItems(state: any): { nombre: string; fecha: string; kind: string; mascota: string }[] {
  const today = todayISO();
  const remDays = typeof state?.remDays === "number" ? state.remDays : 30;
  const items: { nombre: string; fecha: string; kind: string; mascota: string }[] = [];
  for (const pet of (state?.pets || [])) {
    const mascota = pet?.info?.nombre || "Mascota";
    for (const v of (pet?.vaccines || [])) {
      if (v?.proxima && daysBetween(today, v.proxima) <= remDays) items.push({ nombre: v.nombre, fecha: v.proxima, kind: "vacuna", mascota });
    }
    for (const d of (pet?.dewormings || [])) {
      if (d?.proxima && daysBetween(today, d.proxima) <= remDays) items.push({ nombre: d.producto || (d.tipo === "externa" ? "Antipulgas" : "Desparasitación"), fecha: d.proxima, kind: "desparasitación", mascota });
    }
  }
  return items;
}

const I18N: Record<string, { subject: string; intro: string; foot: string }> = {
  es: { subject: "Recordatorio de VacuPet 🐾", intro: "Tu mascota tiene cuidados próximos:", foot: "Orientativo. No reemplaza la consulta veterinaria." },
  en: { subject: "VacuPet reminder 🐾", intro: "Your pet has upcoming care:", foot: "Guidance only. Does not replace veterinary advice." },
  pt: { subject: "Lembrete do VacuPet 🐾", intro: "Seu pet tem cuidados próximos:", foot: "Orientativo. Não substitui a consulta veterinária." },
};

function emailHtml(lang: string, items: { nombre: string; fecha: string; kind: string; mascota: string }[]): string {
  const L = I18N[lang] || I18N.es;
  const rows = items.map((i) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.mascota}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.kind} — ${i.nombre}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.fecha}</td></tr>`
  ).join("");
  return `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#16A34A">🐾 VacuPet</h2><p>${L.intro}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
    <p style="color:#888;font-size:12px;margin-top:18px">${L.foot}</p></div>`;
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (provided !== CRON_SECRET) return new Response("forbidden", { status: 403 });
  }
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "Falta RESEND_API_KEY" }), { status: 500 });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = todayISO();

  const { data: states, error } = await supa.from("vacupet_state").select("user_id, data, last_notified");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  for (const row of (states || [])) {
    if (row.last_notified === today) continue;
    const items = dueItems(row.data);
    if (items.length === 0) continue;

    // Email del usuario (vía Admin API con la service role key)
    const { data: u } = await supa.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) continue;

    const lang = (row.data?.lang) || "es";
    const L = I18N[lang] || I18N.es;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: [email], subject: L.subject, html: emailHtml(lang, items) }),
    });
    if (r.ok) {
      await supa.from("vacupet_state").update({ last_notified: today }).eq("user_id", row.user_id);
      sent++;
    } else {
      console.error("Resend error:", r.status, await r.text());
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
});
