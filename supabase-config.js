// ============================================================
//  Configuración de Supabase (sincronización en la nube)
// ------------------------------------------------------------
//  Pega aquí los datos de TU proyecto Supabase.
//  Los encuentras en:  Supabase > Project Settings > API
//
//  - url:     "Project URL"   (ej: https://abcdxyz.supabase.co)
//  - anonKey: "anon public"   (la clave larga que empieza con eyJ... o sb_publishable_...)
//
//  La anon key es PÚBLICA por diseño: la seguridad la da el RLS
//  (Row Level Security) configurado en la base de datos.
//
//  Si dejas estos campos vacíos, la app funciona en modo LOCAL
//  (sin nube), igual que offline.  Ver docs/SUPABASE_SETUP.md (Fase 3).
// ============================================================
window.VACUPET_SUPABASE = {
  url: "https://zrcpnuzodxxfipnelrvy.supabase.co",
  anonKey: "sb_publishable_1xggN_uZGWROPaq1O7CnXg_Z6kujw-g"
};

// ------------------------------------------------------------
//  Asistente IA y endpoints de Edge Functions.
//  El asistente es HÍBRIDO: lo del carné/esquema se resuelve con reglas
//  en el dispositivo (sin enviar datos); SÓLO la FAQ veterinaria general
//  usa el endpoint remoto (con tu consentimiento).
//  Si la url está vacía, todo degrada a modo 100% local/offline.
// ------------------------------------------------------------
window.VACUPET_AI = (function () {
  var base = window.VACUPET_SUPABASE.url ? window.VACUPET_SUPABASE.url.replace(/\/$/, "") : null;
  return {
    // FAQ veterinaria general (educativa, con disclaimers fuertes)
    faqEndpoint: base ? base + "/functions/v1/vacupet-faq" : null,
    // Escanear carné veterinario con IA (visión). La foto va a Claude con tu consentimiento.
    ocrEndpoint: base ? base + "/functions/v1/vacupet-ocr" : null,
    // Firma del QR de integridad del carné (exportación profesional)
    signEndpoint: base ? base + "/functions/v1/vacupet-sign" : null,
    // Recordatorios push reales (Web Push). Pega aquí tu clave PÚBLICA VAPID
    // (ver docs/DESPLIEGUE.md, Fase 4). Si es null, sólo hay avisos locales/.ics.
    vapidPublicKey: "BPdlURsf3iIFB5sjb6PSC5IxwlXX4p4fVMlXQE76TaOcIuzXWQ-U2l6_tpUzpa8juH8zYHqU39MhMGgTG-FP5aw"
  };
})();
