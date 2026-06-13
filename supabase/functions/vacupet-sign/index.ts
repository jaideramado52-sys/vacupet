// VacuPet — Edge Function "vacupet-sign" (Fase 6 · Firma del QR de integridad)
// ------------------------------------------------------------------------
// Firma un token compacto (JWS/JWT, ES256 / ECDSA P-256) del carné para que la
// vista compartida verifique que no fue alterado (✓ verificada / ⚠ alterada).
//   POST {payload}     → { token, kid }     (firma)
//   GET  ?jwks=1        → { keys: [JWK pública] }   (verificación pública)
//
// Secrets: SIGN_PRIVATE_JWK (JWK privado EC P-256, de scripts/gen-keys.mjs), SIGN_KID.

const ALLOW_ORIGIN = Deno.env.get("FAQ_ALLOW_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const PRIV = JSON.parse(Deno.env.get("SIGN_PRIVATE_JWK") || "{}");
const KID = Deno.env.get("SIGN_KID") || "vacupet-1";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (str: string) => b64url(new TextEncoder().encode(str));

async function signingKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey("jwk", PRIV, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  // Clave pública (JWKS) para verificación en el cliente.
  if (req.method === "GET" || url.searchParams.has("jwks")) {
    if (!PRIV.x || !PRIV.y) return json({ error: "Clave no configurada" }, 500);
    const { d: _d, ...pub } = PRIV;
    return json({ keys: [{ ...pub, kid: KID, use: "sig", alg: "ES256" }] });
  }

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!PRIV.d) return json({ error: "Falta SIGN_PRIVATE_JWK" }, 500);

  let body: { payload?: unknown };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const payload = body.payload ?? body;

  const header = { alg: "ES256", kid: KID, typ: "JWT" };
  const signingInput = b64urlStr(JSON.stringify(header)) + "." + b64urlStr(JSON.stringify(payload));

  try {
    const key = await signingKey();
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
    const token = signingInput + "." + b64url(new Uint8Array(sig));
    return json({ token, kid: KID });
  } catch (e) {
    console.error("sign error:", e);
    return json({ error: "No se pudo firmar." }, 500);
  }
});
