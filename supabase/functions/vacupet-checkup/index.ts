// VacuPet — Edge Function "vacupet-checkup" (Fase 4 · Chequeo por foto con IA)
// ---------------------------------------------------------------------------
// Recibe una FOTO de una zona de la mascota (piel, ojos, dientes, oídos, otro)
// y devuelve ORIENTACIÓN estructurada: observaciones visibles, nivel de
// urgencia (verde/ambar/rojo) y cuándo consultar al veterinario.
//
// NUNCA diagnostica ni receta: es triaje orientativo con disclaimer obligatorio.
// El cliente pide consentimiento explícito antes de enviar la foto (igual que
// el OCR) y muestra siempre el aviso.
//
// Secrets: ANTHROPIC_API_KEY, CHECKUP_MODEL (def. "claude-opus-4-8"), FAQ_ALLOW_ORIGIN.

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
    observaciones: {
      type: "array",
      description: "Lo que se ve en la foto, en lenguaje llano (máx. 4 puntos). Solo lo visible, sin especular.",
      items: { type: "string" },
    },
    nivel: {
      type: "string",
      enum: ["verde", "ambar", "rojo"],
      description: "verde=sin señales visibles de alarma; ambar=vigilar y consultar si persiste 24-48h o empeora; rojo=consulta veterinaria pronto/urgente",
    },
    recomendacion: {
      type: "string",
      description: "Qué hacer ahora, en 1-2 frases claras (vigilar X, no aplicar nada sin indicación, acudir al vet en N días / hoy). Nunca nombrar medicamentos.",
    },
    calidad_foto: {
      type: "string",
      enum: ["buena", "mejorable"],
      description: "mejorable = borrosa/oscura/lejos: sugiere repetir la foto",
    },
  },
  required: ["observaciones", "nivel", "recomendacion", "calidad_foto"],
};

const SYSTEM = `Eres un asistente de triaje visual veterinario para dueños de mascotas.
Recibes una foto de una zona del animal y una nota opcional del dueño. Tu trabajo es
describir SOLO lo visible y orientar sobre urgencia, con máxima prudencia.

Reglas estrictas:
- NO diagnostiques enfermedades concretas ni des nombres de medicamentos o dosis.
- Si hay CUALQUIER señal potencialmente seria (sangre activa, herida profunda, ojo cerrado
  con dolor, inflamación importante, dificultad evidente), nivel = "rojo".
- Si la foto no permite valorar bien, dilo (calidad_foto="mejorable") y sé conservador.
- Si la imagen no parece de un animal, devuelve observaciones vacías y nivel "verde" con
  recomendación de repetir la foto.
- Responde en el idioma indicado (es/en/pt). Tono calmado, sin alarmismo ni tecnicismos.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Falta el secret ANTHROPIC_API_KEY" }, 500);
  const model = Deno.env.get("CHECKUP_MODEL") || "claude-opus-4-8";

  let body: { image?: string; mediaType?: string; lang?: string; especie?: string; zona?: string; nota?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  let imageData = (body.image || "").toString();
  let mediaType = (body.mediaType || "image/jpeg").toString();
  const m = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
  if (m) { mediaType = m[1]; imageData = m[2]; }
  if (!imageData) return json({ error: "Falta la imagen" }, 400);

  const lang = ["es", "en", "pt"].includes(body.lang || "") ? body.lang : "es";
  const ctx = [
    `Idioma de respuesta: ${lang}.`,
    body.especie ? `Especie: ${String(body.especie).slice(0, 30)}.` : "",
    body.zona ? `Zona fotografiada: ${String(body.zona).slice(0, 30)}.` : "",
    body.nota ? `Nota del dueño: ${String(body.nota).slice(0, 300)}` : "",
  ].filter(Boolean).join(" ");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        system: SYSTEM,
        tools: [{ name: "reportar_chequeo", description: "Reporta el resultado del chequeo visual.", input_schema: SCHEMA }],
        tool_choice: { type: "tool", name: "reportar_chequeo" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
            { type: "text", text: `Evalúa esta foto. ${ctx}` },
          ],
        }],
      }),
    });
    if (!r.ok) {
      console.error("Anthropic error:", r.status, await r.text());
      return json({ error: "El chequeo no está disponible ahora mismo." }, 502);
    }
    const dataR = await r.json();
    if (dataR.stop_reason === "refusal") return json({ error: "No se pudo procesar la imagen." }, 422);
    const tool = (dataR.content || []).find((b: { type: string }) => b.type === "tool_use");
    const out = tool?.input || {};
    return json({
      observaciones: Array.isArray(out.observaciones) ? out.observaciones.slice(0, 4) : [],
      nivel: ["verde", "ambar", "rojo"].includes(out.nivel) ? out.nivel : "ambar",
      recomendacion: String(out.recomendacion || "").slice(0, 400),
      calidad_foto: out.calidad_foto === "mejorable" ? "mejorable" : "buena",
    });
  } catch (e) {
    console.error("checkup:", e);
    return json({ error: "Error del servidor" }, 500);
  }
});
