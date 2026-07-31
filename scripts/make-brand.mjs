#!/usr/bin/env node
// VacuPet — Generador de builds de MARCA BLANCA (Fase 4 · B2B clínicas)
// ---------------------------------------------------------------------
// Uso (desde la raíz del repo):
//   node scripts/make-brand.mjs brands/mi-clinica.json
//
// Produce dist-brands/<slug>/ listo para desplegar en un subdominio
// (clinica.vacupets.com) o en el dominio de la clínica (Netlify/Pages).
// El build es la app completa con window.VACUPET_BRAND inyectado DESPUÉS de
// supabase-config.js (así la marca de la clínica pisa la config por defecto)
// y el manifest renombrado para que la PWA instale con el nombre de la clínica.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const cfgPath = process.argv[2];
if (!cfgPath || !existsSync(cfgPath)) {
  console.error("Uso: node scripts/make-brand.mjs brands/<clinica>.json");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const brand = { enabled: true, ...(cfg.brand || {}) };
if (!brand.name && !brand.clinicName) {
  console.error("✗ El JSON necesita brand.name o brand.clinicName");
  process.exit(1);
}
const slug = String(cfg.slug || brand.clinicName || brand.name)
  .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clinica";

const out = join("dist-brands", slug);
mkdirSync(out, { recursive: true });

// 1) Copiar el frontend (misma lista que netlify-build.sh)
const FILES = [
  "VacuPet.html", "index.html", "supabase-config.js", "service-worker.js",
  "manifest.webmanifest", "icon.svg", "icon-maskable.svg", "og-image.svg",
  "og-image.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "icon-maskable-512.png", "_headers",
];
for (const f of FILES) if (existsSync(f)) copyFileSync(f, join(out, f));
for (const d of ["legal/privacidad", "legal/terminos", "legal/reembolsos"])
  if (existsSync(d)) cpSync(d, join(out, d.split("/")[1]), { recursive: true });
// OJO: sin CNAME — el dominio lo decide cada despliegue.

// 2) brand.js con la identidad de la clínica
writeFileSync(join(out, "brand.js"),
  "// Generado por scripts/make-brand.mjs — NO editar a mano\n" +
  "window.VACUPET_BRAND = " + JSON.stringify(brand, null, 2) + ";\n");

// 3) Inyectar brand.js justo después de supabase-config.js
const htmlPath = join(out, "VacuPet.html");
let html = readFileSync(htmlPath, "utf8");
const tag = '<script src="./supabase-config.js"></script>';
if (!html.includes(tag)) { console.error("✗ No encontré el tag de supabase-config.js"); process.exit(1); }
html = html.replace(tag, tag + '\n<script src="./brand.js"></script>');
writeFileSync(htmlPath, html);

// 4) Manifest con el nombre/color de la clínica (la PWA instala con su marca)
const mfPath = join(out, "manifest.webmanifest");
const mf = JSON.parse(readFileSync(mfPath, "utf8"));
mf.name = brand.name || brand.clinicName;
mf.short_name = (brand.name || brand.clinicName).slice(0, 12);
if (brand.accent) mf.theme_color = brand.accent;
writeFileSync(mfPath, JSON.stringify(mf, null, 2));

console.log(`✓ Build de marca blanca listo: ${out}/`);
console.log(`  Despliegue: sube esa carpeta a Netlify/Pages o apunta ${slug}.vacupets.com`);
