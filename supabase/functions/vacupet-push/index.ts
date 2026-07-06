// VacuPet — Edge Function "vacupet-push" (Fase 4 · Recordatorios push)
// ------------------------------------------------------------------------
// Cron diario: recorre vacupet_state, calcula vencimientos próximos
// (VACUNAS + DESPARASITACIÓN, dentro de la ventana remDays de cada usuario)
// y envía Web Push (VAPID) a sus push_subs. Antiduplicado: una tanda por día
// con la columna last_pushed.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (de scripts/gen-keys.mjs)
//   CRON_SECRET (opcional; protege el endpoint del cron)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
//
// Programa el cron diario en Supabase (Dashboard > Database > Cron o pg_cron).

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")  || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")     || "mailto:admin@vacupet.app";
const CRON_SECRET   = Deno.env.get("CRON_SECRET")       || "";
// Enforcement de servidor: si "1", solo se notifica a usuarios con premium vigente.
// Off por defecto para no romper el push gratuito mientras la monetización esté apagada.
const ENFORCE       = Deno.env.get("BILLING_ENFORCE")   === "1";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z"), b = Date.parse(bISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

// Recordatorios "vencidos o próximos" dentro de la ventana del usuario.
function dueItems(state: any): { nombre: string; fecha: string; kind: string; mascota: string }[] {
  const today = todayISO();
  const remDays = typeof state?.remDays === "number" ? state.remDays : 30;
  const items: { nombre: string; fecha: string; kind: string; mascota: string }[] = [];
  for (const pet of (state?.pets || [])) {
    const mascota = pet?.info?.nombre || "Mascota";
    for (const v of (pet?.vaccines || [])) {
      if (v?.proxima && daysBetween(today, v.proxima) <= remDays) {
        items.push({ nombre: v.nombre, fecha: v.proxima, kind: "vacuna", mascota });
      }
    }
    for (const d of (pet?.dewormings || [])) {
      if (d?.proxima && daysBetween(today, d.proxima) <= remDays) {
        items.push({ nombre: d.producto || (d.tipo === "externa" ? "Antipulgas" : "Desparasitación"), fecha: d.proxima, kind: "desparasitación", mascota });
      }
    }
  }
  return items;
}

function bodyFor(lang: string, i: { nombre: string; fecha: string; mascota: string }, more: number): string {
  const M: Record<string, (n: number) => string> = {
    es: (n) => `${i.mascota}: ${i.nombre} (${i.fecha})${n > 0 ? ` y ${n} más` : ""}`,
    en: (n) => `${i.mascota}: ${i.nombre} (${i.fecha})${n > 0 ? ` and ${n} more` : ""}`,
    pt: (n) => `${i.mascota}: ${i.nombre} (${i.fecha})${n > 0 ? ` e mais ${n}` : ""}`,
  };
  return (M[lang] || M.es)(more);
}

Deno.serve(async (req) => {
  // Protección opcional del cron
  if (CRON_SECRET) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (provided !== CRON_SECRET) return new Response("forbidden", { status: 403 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: "Faltan claves VAPID" }), { status: 500 });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = todayISO();

  const { data: states, error } = await supa
    .from("vacupet_state")
    .select("user_id, data, last_pushed");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Enforcement: si está activo, precarga el set de usuarios con premium vigente.
  let premium: Set<string> | null = null;
  if (ENFORCE) {
    const { data: ents } = await supa
      .from("entitlements").select("user_id, active, valid_until").eq("active", true);
    premium = new Set((ents || [])
      .filter((e: any) => !e.valid_until || e.valid_until >= today)
      .map((e: any) => e.user_id));
  }

  let sent = 0, users = 0;
  for (const row of (states || [])) {
    if (row.last_pushed === today) continue;          // ya notificado hoy
    if (premium && !premium.has(row.user_id)) continue; // recordatorios = premium
    const items = dueItems(row.data);
    if (items.length === 0) continue;

    const { data: subs } = await supa.from("push_subs").select("sub, lang").eq("user_id", row.user_id);
    if (!subs || subs.length === 0) continue;

    const lang = (row.data?.lang) || (subs[0]?.lang) || "es";
    const payload = JSON.stringify({
      title: "VacuPet",
      body: bodyFor(lang, items[0], items.length - 1),
      url: "./VacuPet.html",
      tag: "vacupet-reminder",
    });

    for (const s of subs) {
      try {
        await webpush.sendNotification(s.sub, payload);
        sent++;
      } catch (e: any) {
        // 404/410 = suscripción caducada: límpiala
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supa.from("push_subs").delete().eq("endpoint", s.sub?.endpoint || "");
        }
      }
    }
    await supa.from("vacupet_state").update({ last_pushed: today }).eq("user_id", row.user_id);
    users++;
  }

  return new Response(JSON.stringify({ ok: true, users, sent }), { headers: { "Content-Type": "application/json" } });
});
