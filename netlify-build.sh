#!/usr/bin/env bash
# VacuPet — "build" de Netlify: copia solo el frontend a dist/.
set -euo pipefail
rm -rf dist && mkdir -p dist
cp VacuPet.html index.html supabase-config.js service-worker.js manifest.webmanifest \
   icon.svg icon-maskable.svg og-image.svg _headers CNAME dist/
echo "✓ dist/ listo ($(ls dist | wc -l) archivos)"
