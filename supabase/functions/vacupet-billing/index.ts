// VacuPet — Edge Function "vacupet-billing" (Fase A · webhook de facturación)
// ------------------------------------------------------------------------
// Recibe los webhooks del proveedor de pago y mantiene la tabla `entitlements`
// como ÚNICA fuente de verdad de "premium" (para el enforcement de servidor).
//
// Diseñada para RevenueCat (unifica App Store IAP + Google Play + Web Billing),
// que envía { event: { type, app_user_id, product_id, expiration_at_ms, store, ... } }
// con un header  Authorization: <secret>  configurable en su panel.
// También acepta un formato genérico (sin envoltorio `event`) por si se usa
// Lemon Squeezy/Stripe directo mapeando los campos equivalentes.
//
// IMPORTANTE (mapeo de usuario): al inicializar el SDK / checkout hay que fijar
// el `app_user_id` de RevenueCat = el user_id de Supabase (auth.users.id, UUID).
// Si el app_user_id no es un UUID (p. ej. $RCAnonymousID:...) se ignora: no hay
// a quién conceder el entitlement.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   BILLING_WEBHOOK_SECRET   → el mismo valor que pongas en el header del webhook de RevenueCat.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente
// (el service role escribe entitlements saltándose RLS).
//
// config.toml:  [functions.vacupet-billing]  verify_jwt = false   (lo protege el secret, no un JWT)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("BILLING_WEBHOOK_SECRET") || "";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Eventos que CONCEDEN acceso vigente.
const GRANT = new Set([
  "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT",
]);
// Eventos que REVOCAN el acceso. Nota: CANCELLATION NO revoca (el usuario
// conserva el acceso hasta la fecha de expiración → llegará EXPIRATION).
const REVOKE = new Set([
  "EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED",
]);

function planFrom(productId: string, type: string): string {
  const p = (productId || "").toLowerCase();
  if (type === "NON_RENEWING_PURCHASE" || p.includes("lifetime") || p.includes("vitalicio")) return "lifetime";
  if (p.includes("year") || p.includes("annual") || p.includes("anual")) return "yearly";
  if (p.includes("month") || p.includes("mensual")) return "monthly";
  return "premium";
}

// ms epoch → 'YYYY-MM-DD' (date). null = sin vencimiento (lifetime).
function untilFrom(ms: number | null | undefined, plan: string): string | null {
  if (plan === "lifetime") return null;
  if (!ms || !isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // 1) Verificación de firma/secreto (constante e infalsificable desde el cliente).
  if (!WEBHOOK_SECRET) return new Response("server misconfigured", { status: 500 });
  const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (auth !== WEBHOOK_SECRET) return new Response("unauthorized", { status: 401 });

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }

  // RevenueCat envuelve en `event`; el modo genérico usa el objeto raíz.
  const ev = payload?.event ?? payload;
  const type: string = (ev?.type || ev?.event_type || "").toUpperCase();
  const appUserId: string = ev?.app_user_id || ev?.user_id || ev?.original_app_user_id || "";

  // 2) Mapear al user_id de Supabase. Si no es un UUID, no hay a quién aplicarlo.
  if (!UUID_RE.test(appUserId)) {
    return new Response(JSON.stringify({ ok: true, skipped: "app_user_id no es UUID de Supabase" }),
      { headers: { "Content-Type": "application/json" } });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const plan = planFrom(ev?.product_id || ev?.product_identifier || "", type);
  const store = ev?.store || ev?.environment || null;
  const customer = ev?.original_app_user_id || appUserId;

  let result = "ignored";

  if (GRANT.has(type)) {
    const until = untilFrom(ev?.expiration_at_ms ?? ev?.expires_at_ms, plan);
    const { error } = await supa.from("entitlements").upsert({
      user_id: appUserId, active: true, plan, valid_until: until,
      provider: "revenuecat", store, customer_id: customer, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    result = "granted";
  } else if (REVOKE.has(type)) {
    const { error } = await supa.from("entitlements").upsert({
      user_id: appUserId, active: false, plan, provider: "revenuecat",
      store, customer_id: customer, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    result = "revoked";
  }
  // CANCELLATION / BILLING_ISSUE / TRANSFER / TEST → 200 sin cambiar acceso.

  return new Response(JSON.stringify({ ok: true, type, result }),
    { headers: { "Content-Type": "application/json" } });
});
