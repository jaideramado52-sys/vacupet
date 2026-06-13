// VacuPet — Edge Function "eliminar-cuenta" (Fase 7 · Borrado de cuenta y datos)
// ------------------------------------------------------------------------
// Borra de forma definitiva la cuenta del usuario autenticado y TODOS sus
// datos: vacupet_state, shares, push_subs, objetos del bucket "mascotas" y el
// propio auth.user. Operación irreversible; el cliente confirma antes.
//
// El usuario se identifica con su JWT (Authorization: Bearer <access_token>).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOW_ORIGIN = Deno.env.get("FAQ_ALLOW_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Falta autenticación" }, 401);

  // Verifica el usuario con su propio token (anon + header).
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uerr } = await userClient.auth.getUser(jwt);
  if (uerr || !user) return json({ error: "Sesión no válida" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const uid = user.id;

  try {
    // 1) Borra objetos de Storage del usuario (carpeta = user_id)
    try {
      const { data: files } = await svc.storage.from("mascotas").list(uid);
      if (files && files.length) {
        await svc.storage.from("mascotas").remove(files.map((f) => `${uid}/${f.name}`));
      }
    } catch (_) { /* bucket puede no existir aún */ }

    // 2) Borra filas propias (también caería por ON DELETE CASCADE al borrar el usuario)
    await svc.from("push_subs").delete().eq("user_id", uid);
    await svc.from("shares").delete().eq("user_id", uid);
    await svc.from("vacupet_state").delete().eq("user_id", uid);

    // 3) Borra el usuario de auth
    const { error: derr } = await svc.auth.admin.deleteUser(uid);
    if (derr) return json({ error: derr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error("eliminar-cuenta error:", e);
    return json({ error: "No se pudo eliminar la cuenta." }, 500);
  }
});
