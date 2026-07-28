// VacuPet — Edge Function "vacupet-wallet" (Fase 2 · Carné en Google Wallet)
// ---------------------------------------------------------------------------
// Genera un enlace "Save to Google Wallet" (JWT RS256 firmado con la service
// account del emisor) para un pase genérico con los datos del carné:
//   POST { pet:{nombre, especie, raza?, microchip?, rabia?, rabiaFecha?, estado?}, link? }
//     → { url }   (https://pay.google.com/gp/v/save/<jwt>)
//
// Requisitos (ver docs/GOOGLE_WALLET.md):
//   1. Cuenta de emisor en Google Pay & Wallet Console (issuer ID).
//   2. Service account con rol "Wallet Object Issuer" y su JSON.
//   3. Una GenericClass creada (ej. "vacupet_carne").
// Secrets: WALLET_SA_JSON (JSON completo de la service account),
//          WALLET_ISSUER_ID, WALLET_CLASS_ID (por defecto "vacupet_carne").

const ALLOW_ORIGIN = Deno.env.get("FAQ_ALLOW_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SA = JSON.parse(Deno.env.get("WALLET_SA_JSON") || "{}");
const ISSUER = Deno.env.get("WALLET_ISSUER_ID") || "";
const CLASS = Deno.env.get("WALLET_CLASS_ID") || "vacupet_carne";

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Importa la clave privada PKCS#8 (PEM) de la service account para RS256.
async function importKey(pem: string): Promise<CryptoKey> {
  const raw = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!SA.client_email || !SA.private_key || !ISSUER) return json({ error: "wallet_not_configured" }, 503);

  let body: { pet?: Record<string, string>; link?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const pet = body.pet || {};
  const nombre = String(pet.nombre || "").slice(0, 60);
  if (!nombre) return json({ error: "pet_required" }, 400);

  const objectId = `${ISSUER}.${crypto.randomUUID()}`;
  const rows: Array<{ id: string; label: string; value: string }> = [];
  if (pet.especie) rows.push({ id: "especie", label: "Especie", value: String(pet.especie).slice(0, 40) });
  if (pet.raza) rows.push({ id: "raza", label: "Raza", value: String(pet.raza).slice(0, 40) });
  if (pet.microchip) rows.push({ id: "chip", label: "Microchip", value: String(pet.microchip).slice(0, 40) });
  if (pet.rabia) rows.push({ id: "rabia", label: "Antirrábica", value: String(pet.rabia).slice(0, 60) });

  const objectPayload = {
    id: objectId,
    classId: `${ISSUER}.${CLASS}`,
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "es", value: "VacuPet · Carné de salud" } },
    header: { defaultValue: { language: "es", value: nombre } },
    subheader: pet.estado
      ? { defaultValue: { language: "es", value: String(pet.estado).slice(0, 40) } }
      : undefined,
    hexBackgroundColor: "#0D9488",
    textModulesData: rows.map((r) => ({ id: r.id, header: r.label, body: r.value })),
    barcode: body.link ? { type: "QR_CODE", value: String(body.link).slice(0, 2300) } : undefined,
  };

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: SA.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: now,
    payload: { genericObjects: [objectPayload] },
  };

  try {
    const header = { alg: "RS256", typ: "JWT" };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
    const key = await importKey(SA.private_key);
    const sig = new Uint8Array(await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput),
    ));
    return json({ url: `https://pay.google.com/gp/v/save/${signingInput}.${b64url(sig)}` });
  } catch (e) {
    console.error("wallet sign:", e);
    return json({ error: "sign_failed" }, 500);
  }
});
