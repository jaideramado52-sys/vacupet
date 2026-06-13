// VacuPet — Edge Function "vacupet-ocr" (Fase 5 · Escanear carné veterinario)
// ------------------------------------------------------------------------
// Recibe una FOTO del carné veterinario y devuelve, con Claude visión +
// structured outputs, una lista de vacunas/desparasitaciones detectadas
// (nombre, fecha, lote, producto…). El cliente SIEMPRE muestra una pantalla
// de revisión antes de guardar; los registros se marcan con source:"ocr".
//
// Consentimiento separado en el cliente: la foto SÍ lleva datos, se envía con
// permiso explícito del usuario. La API key vive solo en el servidor.
//
// Secrets: ANTHROPIC_API_KEY, OCR_MODEL (def. "claude-opus-4-8").
//
// TODO (Fase 5): implementar igual que vacupet-faq pero con contenido de imagen
// y un tool/structured output que valide el esquema { vacunas:[], desparasitaciones:[] }.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "vacupet-ocr: no implementado todavía (Fase 5)." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  })
);
