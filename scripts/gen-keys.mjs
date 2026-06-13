#!/usr/bin/env node
/* VacuPet — generador de claves para el despliegue.
 * Genera:
 *   1) SIGN_PRIVATE_JWK  → firma del QR de integridad (vacupet-sign, ES256/P-256)
 *   2) VAPID public/private → recordatorios push (vacupet-push, Web Push)
 * No requiere dependencias (usa WebCrypto de Node 18+).
 *
 * Uso:   node scripts/gen-keys.mjs
 * Las claves se imprimen UNA vez. Guárdalas en tu gestor de secretos;
 * NO las subas al repo. */

const { subtle } = globalThis.crypto;
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function genSign() {
  const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = await subtle.exportKey("jwk", kp.privateKey);
  const { kty, crv, x, y, d } = priv;
  return JSON.stringify({ kty, crv, x, y, d });
}

async function genVapid() {
  const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const rawPub = await subtle.exportKey("raw", kp.publicKey);     // 65 bytes (punto sin comprimir)
  const jwkPriv = await subtle.exportKey("jwk", kp.privateKey);   // d = escalar privado (32B base64url)
  return { publicKey: b64url(rawPub), privateKey: jwkPriv.d };
}

const SIGN_PRIVATE_JWK = await genSign();
const vapid = await genVapid();

console.log("\n=============================================================");
console.log(" VacuPet — claves generadas (guárdalas, no las subas al repo)");
console.log("=============================================================\n");

console.log("1) FIRMA DEL QR DE INTEGRIDAD (vacupet-sign):");
console.log("   supabase secrets set SIGN_PRIVATE_JWK='" + SIGN_PRIVATE_JWK + "'\n");

console.log("2) RECORDATORIOS PUSH (vacupet-push):");
console.log("   supabase secrets set VAPID_PUBLIC_KEY=" + vapid.publicKey);
console.log("   supabase secrets set VAPID_PRIVATE_KEY=" + vapid.privateKey);
console.log("   supabase secrets set VAPID_SUBJECT=mailto:tu-correo@dominio.com\n");

console.log("3) PEGA LA CLAVE PÚBLICA VAPID en supabase-config.js → window.VACUPET_AI.vapidPublicKey:");
console.log('   vapidPublicKey: "' + vapid.publicKey + '"\n');

console.log("(La clave pública de firma se publica sola vía vacupet-sign?jwks=1; no hay que copiarla.)\n");
