#!/usr/bin/env bash
# VacuPet — despliegue de Edge Functions + secrets.  (Fase 4 del ROADMAP.)
# Requisitos: Supabase CLI (https://supabase.com/docs/guides/cli) y haber hecho
#   supabase login   &&   supabase link --project-ref <TU_REF>
#
# 1) Copia .env.deploy.example a .env.deploy y rellena tus valores.
# 2) Genera las claves:  node scripts/gen-keys.mjs  (pega VAPID/SIGN ahí).
# 3) Ejecuta:  bash deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ Falta el Supabase CLI. Instálalo: https://supabase.com/docs/guides/cli"; exit 1
fi

# Carga variables de .env.deploy (si existe)
if [ -f .env.deploy ]; then
  set -a; . ./.env.deploy; set +a
  echo "✓ Cargado .env.deploy"
else
  echo "⚠ No hay .env.deploy — sólo se desplegará el código (configura los secrets manualmente)."
fi

echo "── Desplegando funciones ───────────────────────────────"
# Públicas (la app las llama sin sesión): faq, ocr, sign
supabase functions deploy vacupet-faq  --no-verify-jwt
supabase functions deploy vacupet-ocr  --no-verify-jwt
supabase functions deploy vacupet-sign --no-verify-jwt
# Backend (cron / servidor): push, recordatorios, eliminar-cuenta
supabase functions deploy vacupet-push
supabase functions deploy recordatorios   || true
supabase functions deploy eliminar-cuenta || true

echo "── Configurando secrets (sólo los que tengan valor) ────"
set_secret () { # set_secret NOMBRE "$VALOR"
  if [ -n "${2:-}" ]; then supabase secrets set "$1=$2" >/dev/null && echo "  ✓ $1"; else echo "  · $1 (vacío, omitido)"; fi
}
set_secret ANTHROPIC_API_KEY   "${ANTHROPIC_API_KEY:-}"
set_secret FAQ_MODEL           "${FAQ_MODEL:-}"
set_secret OCR_MODEL           "${OCR_MODEL:-}"
set_secret FAQ_ALLOW_ORIGIN    "${FAQ_ALLOW_ORIGIN:-}"
set_secret SIGN_PRIVATE_JWK    "${SIGN_PRIVATE_JWK:-}"
set_secret SIGN_KID            "${SIGN_KID:-}"
set_secret VAPID_PUBLIC_KEY    "${VAPID_PUBLIC_KEY:-}"
set_secret VAPID_PRIVATE_KEY   "${VAPID_PRIVATE_KEY:-}"
set_secret VAPID_SUBJECT       "${VAPID_SUBJECT:-}"
set_secret RESEND_API_KEY      "${RESEND_API_KEY:-}"
set_secret CRON_SECRET         "${CRON_SECRET:-}"

echo "──────────────────────────────────────────────────────────"
echo "✓ Listo. Recuerda:"
echo "  • Ejecutar supabase/schema.sql en el SQL Editor (tablas + RLS)."
echo "  • Pegar la clave pública VAPID en supabase-config.js."
echo "  • Programar el cron diario de vacupet-push y recordatorios."
echo "  • Probar con docs/DESPLIEGUE.md (checklist)."
