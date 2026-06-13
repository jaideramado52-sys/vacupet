// VacuPet — Edge Function "vacupet-sign" (Fase 6 · Firma del QR de integridad)
// ------------------------------------------------------------------------
// Firma un token compacto del carné (ES256 / ECDSA P-256) para que la vista
// compartida pueda verificar que el carné no fue alterado (✓ verificada / ⚠).
// Expone también el JWKS público para la verificación en el cliente.
//
// Secrets: SIGN_PRIVATE_JWK (JWK privado EC P-256), SIGN_KID.
// Genera las claves con: node scripts/gen-keys.mjs
//
// TODO (Fase 6): implementar firma con WebCrypto (importKey + sign) y
// endpoint GET /jwks que devuelva la clave pública.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "vacupet-sign: no implementado todavía (Fase 6)." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  })
);
