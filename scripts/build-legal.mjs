// Genera las páginas legales públicas (vacupets.com/privacidad, /terminos,
// /reembolsos) a partir de los .md de docs/. Fuente de verdad = los .md.
// Quita la nota interna de "borrador para abogado" (blockquote superior) del
// resultado público. Reejecutar tras editar los .md:  node scripts/build-legal.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UPDATED = '15 de julio de 2026';

const DOCS = [
  { slug: 'privacidad', file: 'docs/PRIVACIDAD.md', nav: 'Privacidad' },
  { slug: 'terminos',   file: 'docs/TERMINOS.md',   nav: 'Términos' },
  { slug: 'reembolsos', file: 'docs/REEMBOLSOS.md', nav: 'Reembolsos' },
];
const MD2SLUG = { 'PRIVACIDAD.md': '/privacidad/', 'TERMINOS.md': '/terminos/', 'REEMBOLSOS.md': '/reembolsos/' };

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline: escapar y luego aplicar código, negrita, enlaces y autolinks.
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  // [texto](destino) — remapea *.md a URL limpia
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => {
    const clean = MD2SLUG[url] || url;
    return `<a href="${clean}">${t}</a>`;
  });
  // autolinks <https://...>  (ya escapados a &lt;...&gt;)
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_, u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  return s;
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0, title = '';
  while (i < lines.length) {
    let line = lines[i];
    if (/^>/.test(line)) { i++; continue; }            // banner interno: fuera del público
    if (line.trim() === '') { i++; continue; }
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      let text = line.replace(/^#+\s/, '').trim();
      if (level === 1) { title = text.replace(/\s*—\s*VacuPet\s*$/, ''); i++; continue; } // el h1 va al header
      out.push(`<h${level}>${inline(text)}</h${level}>`); i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push('<hr>'); i++; continue; }
    if (line.startsWith('|')) {                        // tabla
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = r => r.split('|').slice(1, -1).map(c => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      let t = '<div class="tablewrap"><table><thead><tr>' + head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
      t += body.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('');
      t += '</tbody></table></div>';
      out.push(t); continue;
    }
    if (/^[-*]\s/.test(line)) {                        // lista
      const items = [];
      while (i < lines.length && lines[i].trim() !== '') {
        if (/^[-*]\s/.test(lines[i])) items.push(lines[i].replace(/^[-*]\s/, ''));
        else if (items.length) items[items.length - 1] += ' ' + lines[i].trim();  // continuación
        i++;
      }
      out.push('<ul>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ul>');
      continue;
    }
    // párrafo: junta líneas hasta blanco
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^[#>|-]/.test(lines[i]) && !/^\*{3,}/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return { title, body: out.join('\n') };
}

function page(doc, title, body) {
  const nav = DOCS.map(d =>
    `<a href="/${d.slug}/"${d.slug === doc.slug ? ' aria-current="page" class="on"' : ''}>${d.nav}</a>`
  ).join('');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — VacuPet</title>
<meta name="robots" content="index,follow">
<style>
  :root{ --accent:#0C8479; --bg:#F6FBFA; --surface:#fff; --ink:#152A27; --muted:#5C6E6B; --line:#E0ECE9; }
  @media (prefers-color-scheme: dark){
    :root{ --accent:#2DD4BF; --bg:#0B1512; --surface:#12201C; --ink:#E6F2EF; --muted:#93AAA5; --line:#20302B; }
  }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--ink);
        font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif; }
  .wrap{ max-width:720px; margin:0 auto; padding:0 20px 72px; }
  header.site{ position:sticky; top:0; background:color-mix(in srgb,var(--bg) 88%,transparent);
    backdrop-filter:saturate(160%) blur(12px); border-bottom:1px solid var(--line); }
  header.site .in{ max-width:720px; margin:0 auto; padding:12px 20px; display:flex; align-items:center; gap:10px; }
  .brand{ display:flex; align-items:center; gap:9px; text-decoration:none; color:var(--ink); font-weight:800; font-size:18px; }
  .logo{ width:30px; height:30px; border-radius:8px; background:var(--accent); display:grid; place-items:center; }
  .logo svg{ width:20px; height:20px; }
  .spacer{ flex:1; }
  .toapp{ font-size:13px; font-weight:600; color:var(--accent); text-decoration:none; border:1px solid var(--line);
    padding:7px 12px; border-radius:8px; }
  h1{ font-size:1.85rem; line-height:1.2; margin:34px 0 6px; letter-spacing:-.01em; }
  .updated{ color:var(--muted); font-size:.9rem; margin:0 0 18px; }
  nav.docs{ display:flex; gap:8px; flex-wrap:wrap; margin:0 0 26px; }
  nav.docs a{ font-size:13px; font-weight:600; text-decoration:none; color:var(--muted);
    border:1px solid var(--line); background:var(--surface); padding:7px 13px; border-radius:99px; }
  nav.docs a.on{ color:#fff; background:var(--accent); border-color:var(--accent); }
  @media (prefers-color-scheme: dark){ nav.docs a.on{ color:#08130F; } }
  h2{ font-size:1.25rem; margin:30px 0 8px; }
  h3{ font-size:1.05rem; margin:22px 0 6px; }
  p{ margin:12px 0; }
  a{ color:var(--accent); }
  ul{ margin:12px 0; padding-left:22px; }
  li{ margin:6px 0; }
  code{ font-family:ui-monospace,Consolas,monospace; font-size:.88em; background:color-mix(in srgb,var(--accent) 12%,transparent);
    padding:.1em .35em; border-radius:4px; }
  hr{ border:0; border-top:1px solid var(--line); margin:26px 0; }
  .tablewrap{ overflow-x:auto; margin:16px 0; }
  table{ border-collapse:collapse; width:100%; font-size:.92rem; }
  th,td{ text-align:left; padding:9px 12px; border:1px solid var(--line); vertical-align:top; }
  th{ background:color-mix(in srgb,var(--accent) 8%,transparent); font-weight:700; }
  footer{ margin-top:40px; padding-top:20px; border-top:1px solid var(--line); color:var(--muted); font-size:.9rem; }
  footer a{ font-weight:600; }
</style>
</head>
<body>
<header class="site"><div class="in">
  <a class="brand" href="/">
    <span class="logo"><svg viewBox="0 0 512 512" fill="none"><g fill="#fff"><circle cx="150" cy="180" r="46"/><circle cx="256" cy="150" r="46"/><circle cx="362" cy="180" r="46"/><path d="M256 250c-70 0-120 55-120 110 0 40 40 55 120 55s120-15 120-55c0-55-50-110-120-110z"/></g></svg></span>
    VacuPet
  </a>
  <span class="spacer"></span>
  <a class="toapp" href="/">Abrir la app</a>
</div></header>
<div class="wrap">
  <h1>${title}</h1>
  <p class="updated">Última actualización: ${UPDATED}</p>
  <nav class="docs">${nav}</nav>
  ${body}
  <footer>
    <p>¿Dudas? Escríbenos a <a href="mailto:soporte@vacupets.com">soporte@vacupets.com</a>.</p>
    <p><a href="/">← Volver a VacuPet</a> · © VacuPet</p>
  </footer>
</div>
</body>
</html>`;
}

for (const doc of DOCS) {
  const md = readFileSync(resolve(ROOT, doc.file), 'utf8');
  const { title, body } = mdToHtml(md);
  const outDir = resolve(ROOT, 'legal', doc.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'index.html'), page(doc, title, body), 'utf8');
  console.log(`✓ legal/${doc.slug}/index.html  (${title})`);
}
