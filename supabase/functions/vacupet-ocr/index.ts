// VacuPet — Edge Function "vacupet-ocr" (Fase 5 · Escanear carné veterinario)
// ------------------------------------------------------------------------
// Recibe una FOTO del carné y devuelve, con Claude visión + salida estructurada
// (tool use forzado), una lista de vacunas/desparasitaciones detectadas. El
// cliente SIEMPRE muestra una pantalla de revisión antes de guardar; los
// registros se marcan con source:"ocr".
//
// Por diseño: la API key vive sólo en el servidor. La foto se envía con el
// consentimiento explícito del usuario en el cliente.
//
// Secrets: ANTHROPIC_API_KEY, OCR_MODEL (def. "claude-opus-4-8"), FAQ_ALLOW_ORIGIN.

const ALLOW_ORIGIN = Deno.env.get("FAQ_ALLOW_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  properties: {
    vacunas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la vacuna (ej: Rabia, Polivalente, Trivalente felina)" },
          fecha: { type: "string", description: "Fecha de aplicación en formato AAAA-MM-DD si es legible, si no vacío" },
          dosis: { type: "string" },
          lote: { type: "string" },
          marca: { type: "string" },
          proxima: { type: "string", description: "Próxima fecha AAAA-MM-DD si aparece" },
        },
        required: ["nombre"],
      },
    },
    desparasitaciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          producto: { type: "string" },
          tipo: { type: "string", enum: ["interna", "externa"] },
          fecha: { type: "string", description: "AAAA-MM-DD si es legible" },
          proxima: { type: "string" },
        },
        required: ["producto"],
      },
    },
  },
  required: ["vacunas", "desparasitaciones"],
};

const SYSTEM = `Eres un extractor de datos de carnés veterinarios. Recibes una foto del carné de
salud de una mascota (perro, gato, etc.) y devuelves SOLO los registros que puedas leer con
seguridad, usando la herramienta proporcionada. No inventes datos: si un campo no es legible,
déjalo vacío. Las fechas en formato AAAA-MM-DD. Distingue vacunas de desparasitaciones.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Falta el secret ANTHROPIC_API_KEY" }, 500);
  const model = Deno.env.get("OCR_MODEL") || "claude-opus-4-8";

  let body: { image?: string; mediaType?: string; lang?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  let imageData = (body.image || "").toString();
  let mediaType = (body.mediaType || "image/jpeg").toString();
  // Acepta data URL ("data:image/jpeg;base64,....") o base64 puro.
  const m = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
  if (m) { mediaType = m[1]; imageData = m[2]; }
  if (!imageData) return json({ error: "Falta la imagen" }, 400);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: SYSTEM,
        tools: [{ name: "guardar_registros", description: "Guarda las vacunas y desparasitaciones detectadas en el carné.", input_schema: SCHEMA }],
        tool_choice: { type: "tool", name: "guardar_registros" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
            { type: "text", text: "Extrae las vacunas y desparasitaciones de este carné veterinario." },
          ],
        }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Anthropic error:", r.status, detail);
      return json({ error: "El escáner no está disponible ahora mismo." }, 502);
    }

    const dataR = await r.json();
    if (dataR.stop_reason === "refusal") return json({ error: "No se pudo procesar la imagen." }, 422);
    const tool = (dataR.content || []).find((b: { type: string }) => b.type === "tool_use");
    const out = tool?.input || { vacunas: [], desparasitaciones: [] };
    return json({ vacunas: out.vacunas || [], desparasitaciones: out.desparasitaciones || [] });
  } catch (e) {
    console.error("OCR error:", e);
    return json({ error: "Error de red al escanear." }, 502);
  }
});
