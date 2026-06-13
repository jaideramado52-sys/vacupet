// VacuPet — Edge Function "vacupet-faq" (Fase 5 · Asistente IA, parte FAQ)
// ------------------------------------------------------------------------
// Proxy mínimo y seguro a la API de Claude para responder DUDAS GENERALES de
// salud de mascotas (FAQ educativa). El resto del asistente (qué falta, cuándo
// toca, registrar) se resuelve con REGLAS en el cliente, sin enviar nada aquí.
//
// Por diseño:
//   • La API key vive SOLO en el servidor (secret), nunca en el navegador.
//   • NO recibe ni reenvía datos del carné: solo la pregunta y, como mucho,
//     especie (contexto no identificable).
//   • Respuestas informativas con descargo; nunca diagnóstico ni dosis.
//
// Secrets necesarios (Supabase > Edge Functions > Secrets):
//   ANTHROPIC_API_KEY   (de https://console.anthropic.com)
//   FAQ_MODEL           (opcional; por defecto "claude-opus-4-8")
//                       Para abaratar/acelerar puedes usar "claude-haiku-4-5".

const ALLOW_ORIGIN = Deno.env.get("FAQ_ALLOW_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SYSTEM = `Eres el asistente informativo de VacuPet, una app de carné de salud para mascotas.
Respondes en el idioma indicado, de forma breve, clara y cálida (2–5 frases).

Tu ámbito: SÓLO información GENERAL y educativa sobre salud de mascotas (para qué sirve una
vacuna, qué es la desparasitación interna/externa, importancia del esquema, dudas comunes de
dueños de perros y gatos).

Reglas estrictas (seguridad):
- NUNCA des diagnóstico, dosis de fármacos, ni indicaciones clínicas para un animal concreto.
- NUNCA decidas contraindicaciones para una mascota concreta.
- Ante cualquier signo de enfermedad, urgencia o caso particular, deriva SIEMPRE:
  "consúltalo con tu veterinario".
- No inventes calendarios oficiales; si no estás seguro, dilo y remite al veterinario.
- No reemplazas el carné oficial ni la consulta veterinaria.
- Si te preguntan algo fuera de salud de mascotas, redirige amablemente al tema.
Cierra, cuando aplique, recordando que es información general y no sustituye al veterinario.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Falta el secret ANTHROPIC_API_KEY" }, 500);
  const model = Deno.env.get("FAQ_MODEL") || "claude-opus-4-8";

  let body: { question?: string; especie?: string; lang?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const question = (body.question || "").toString().trim().slice(0, 800);
  if (!question) return json({ error: "Pregunta vacía" }, 400);

  const LANG_NAME: Record<string, string> = { es: "español", en: "English", pt: "português" };
  const langName = LANG_NAME[(body.lang || "es")] || "español";

  // Contexto NO identificable (opcional): sólo la especie.
  const ctx: string[] = [];
  if (body.especie) ctx.push(`Especie: ${String(body.especie).slice(0, 30)}`);
  ctx.push(`Responde SIEMPRE en ${langName}.`);
  const userContent = (ctx.length ? `[Contexto: ${ctx.join(" · ")}]\n\n` : "") + question;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Anthropic error:", r.status, detail);
      return json({ error: "El asistente no está disponible ahora mismo." }, 502);
    }

    const data = await r.json();
    if (data.stop_reason === "refusal") {
      return json({ answer: "No puedo ayudarte con eso. Para temas de salud específicos de tu mascota, consúltalo con tu veterinario." });
    }
    const answer = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    return json({ answer: answer || "No tengo una respuesta para eso ahora mismo." });
  } catch (e) {
    console.error("FAQ proxy error:", e);
    return json({ error: "Error de red al consultar el asistente." }, 502);
  }
});
