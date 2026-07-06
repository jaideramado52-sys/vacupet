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
// ------------------------------------------------------------
//  Monetización (Fase 1 — freemium). APAGADO por defecto:
//  con monetize:false todo está desbloqueado (comportamiento actual,
//  los usuarios no notan ningún cambio). Pon monetize:true para activar
//  el paywall.
//
//  Infra de pago (Fase A): RevenueCat es la fuente de verdad de "premium"
//  (unifica App Store IAP + Google Play + Web Billing). Su webhook llama a
//  la Edge Function `vacupet-billing`, que mantiene la tabla `entitlements`;
//  la app la lee con pullEntitlement(). En la WEB, checkoutUrl es el enlace
//  de pago (RevenueCat Web Billing / Stripe / Lemon Squeezy). La app le añade
//  el user_id de Supabase para que el proveedor lo reenvíe como app_user_id
//  (así el webhook sabe a quién conceder el acceso). Si checkoutUrl está
//  vacío, el botón muestra "próximamente".
//    manageUrl  = portal de gestión / restaurar compra (customer portal).
//    devCode    = desbloqueo local para pruebas / ventas manuales tempranas.
//  IMPORTANTE: monetize:true requiere webhook + BILLING_ENFORCE=1 en Supabase
//  (enforcement de servidor) y ToS/reembolsos publicados. Ver docs/MONETIZACION.md.
// ------------------------------------------------------------
window.VACUPET_FEATURES = {
  monetize: false,
  freePetLimit: 2,
  checkoutUrl: "",   // enlace de pago web (con ?plan= para elegir plan)
  manageUrl: "",     // portal de gestión / restaurar compra
  devCode: ""
};

// ------------------------------------------------------------
//  Partners / recomendaciones (Fase 2 — afiliación + leads).
//  APAGADO por defecto (enabled:false → no se muestra nada).
//  Cada oferta lleva un enlace de afiliado; la app le añade utm_source.
//  contexts: dónde puede aparecer ('home','reminders','more','deworm').
//  countries: ['*'] = todos, o lista de códigos ('GT','MX'...).
//  Pon enabled:true y rellena url cuando tengas acuerdos.
// ------------------------------------------------------------
window.VACUPET_PARTNERS = {
  enabled: false,
  country: "GT",
  offers: [
    // Ejemplos (descomenta y pon tu url de afiliado):
    // { id:"seguro-gt",  type:"insurance", contexts:["home","more"],        countries:["GT","*"],
    //   title:"Protege a tu mascota", sub:"Seguro veterinario desde QXX/mes", cta:"Ver planes", url:"" },
    // { id:"antipulgas", type:"product",   contexts:["deworm","reminders","more"], countries:["*"],
    //   title:"Antipulgas y garrapatas", sub:"Pipetas y collares recomendados",   cta:"Comprar",   url:"" }
  ]
};

// ------------------------------------------------------------
//  Marca blanca / co-branding para clínicas (Fase 4 — Nivel 1).
//  APAGADO por defecto (enabled:false → la app es "VacuPet" normal).
//  Con enabled:true, la clínica pone su nombre, logo, color y contacto.
//  logo: una URL o data-URL (SVG/PNG); accent: color hex de la clínica.
// ------------------------------------------------------------
window.VACUPET_BRAND = {
  enabled: false,
  name: "",            // nombre que reemplaza a "VacuPet" en la cabecera/título
  logo: "",            // URL o data-URL del logo (vacío = patita por defecto)
  accent: "",          // color de acento de la clínica (hex)
  clinicName: "",      // nombre de la clínica (tarjeta "Mi clínica")
  clinicPhone: "",     // teléfono (botón Llamar)
  clinicWhatsApp: "",  // WhatsApp (solo dígitos o con +)
  bookUrl: "",         // enlace para agendar cita
  web: ""              // sitio web de la clínica
};

window.VACUPET_AI = (function () {
  var base = window.VACUPET_SUPABASE.url ? window.VACUPET_SUPABASE.url.replace(/\/$/, "") : null;
  return {
    // FAQ veterinaria general: ahora corre con un LLM LOCAL en el navegador (WebLLM).
    // Las preguntas NO salen del dispositivo. Modelo (lista en https://mlc.ai/models):
    //   "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"  (≈1 GB, multilingüe, recomendado)
    //   "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"  (≈0.5 GB, más ligero, menor calidad)
    //   "Llama-3.2-1B-Instruct-q4f16_1-MLC"  (≈0.9 GB)
    localModel: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    // (Obsoleto: la FAQ ya no usa este endpoint; se deja por compatibilidad.)
    faqEndpoint: null,
    // Escanear carné veterinario con IA (visión). La foto va a Claude con tu consentimiento.
    ocrEndpoint: base ? base + "/functions/v1/vacupet-ocr" : null,
    // Firma del QR de integridad del carné (exportación profesional)
    signEndpoint: base ? base + "/functions/v1/vacupet-sign" : null,
    // Recordatorios push reales (Web Push). Pega aquí tu clave PÚBLICA VAPID
    // (ver docs/DESPLIEGUE.md, Fase 4). Si es null, sólo hay avisos locales/.ics.
    vapidPublicKey: "BPdlURsf3iIFB5sjb6PSC5IxwlXX4p4fVMlXQE76TaOcIuzXWQ-U2l6_tpUzpa8juH8zYHqU39MhMGgTG-FP5aw"
  };
})();
