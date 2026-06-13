// VacuPet — Suite de tests (Fase 9). Ejecuta:  node tests/run.mjs
// ---------------------------------------------------------------------------
// Carga el script del cliente (VacuPet.html) en un entorno con stubs de DOM y
// expone sus funciones internas para verificarlas. La criptografía usa el
// WebCrypto real de Node; las funciones Deno (Edge) se verifican por su lógica
// replicada (idéntica a la del repositorio).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '..', 'VacuPet.html'), 'utf8');

// --- Entorno con stubs de DOM/navegador ---
const stubEl = { innerHTML:'', classList:{add(){},remove(){},toggle(){},contains(){return false}}, addEventListener(){}, value:'', focus(){}, select(){}, style:{} };
globalThis.document = { getElementById:()=>stubEl, documentElement:{ classList:{toggle(){}} }, querySelectorAll:()=>[], addEventListener(){}, createElement:()=>({ getContext:()=>({drawImage(){}}), toDataURL:()=>'', click(){}, appendChild(){} }), head:{appendChild(){}} };
globalThis.window = { addEventListener(){}, scrollTo(){}, VACUPET_AI:{}, VACUPET_SUPABASE:{ url:'', anonKey:'' } };
globalThis.location = { hash:'', origin:'https://app', pathname:'/VacuPet.html' };
globalThis.localStorage = { _s:{}, getItem(k){return this._s[k]??null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };

let code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
code = code.replace(/shared = readShareHash\(\);[\s\S]*$/, '').replace(/"use strict";/, '');
code += `;globalThis.__VP = {
  suggestProxima, suggestDeworm, schemeRule, vaccineOptions,
  todayISO, toISO, addDays, addMonths, daysBetween, monthsBetween,
  reminders, statusOf, petSummary, weightChart, t, tf,
  b64urlEncode, b64urlDecode, urlB64ToUint8, cloudConfigured, shouldAdoptRemote,
  classify, missingVaccines, aWhatsMissing, aNextDose, aNextDeworm, handleIntent, askFaq,
  verifyIntegrity, decodeShareObj, getSig:()=>sharedSig,
  setPin, checkPin, encryptBackup, decryptBackup,
  hasValidRabies, recentDeworm, checkReq, achievements, DESTINOS,
  nextAnniversary, freqLabel, CARE_KINDS,
  getData:()=>data, setData:d=>{data=d}
};`;
(0, eval)(code);
const VP = globalThis.__VP;

// --- Mini runner ---
let pass = 0, fail = 0;
const section = (n) => console.log('\n— ' + n);
const ok = (n, c) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n); } };
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

// =========================================================================
section('Esquema vacunal por especie');
ok('serie cachorro (+21d)', VP.suggestProxima('perro','Polivalente (quíntuple/séxtuple)','2024-01-01','2023-11-01')==='2024-01-22');
ok('refuerzo adulto (+12m)', VP.suggestProxima('perro','Rabia','2024-01-01','2020-01-01')==='2025-01-01');
ok('gato FVRCP existe', !!VP.schemeRule('gato','Trivalente felina (FVRCP)'));
ok('vacuna desconocida → sin sugerencia', VP.suggestProxima('perro','Inventada','2024-01-01','2020-01-01')==='');
ok('deworm interna +3m', VP.suggestDeworm('interna','2024-01-15')==='2024-04-15');
ok('deworm externa +1m', VP.suggestDeworm('externa','2024-01-15')==='2024-02-15');

section('Recordatorios y cobertura');
VP.getData().lang='es'; VP.getData().remDays=30;
const petR = { vaccines:[{id:'1',nombre:'Rabia',fecha:'2024-01-01',proxima:iso(-2)},{id:'2',nombre:'X',fecha:'2024-01-01',proxima:iso(10)}], dewormings:[{id:'3',tipo:'interna',fecha:'2024-01-01',proxima:iso(200)}] };
const sum = VP.petSummary(petR);
ok('aplicadas=3', sum.aplicadas===3);
ok('vencidas=1', sum.vencidas===1);
ok('proximas=1', sum.proximas===1);
ok('estado=vencidas', sum.estado==='vencidas');
ok('statusOf vencida', VP.statusOf(iso(-1))==='vencida');
ok('statusOf proxima', VP.statusOf(iso(10))==='proxima');
ok('statusOf futura', VP.statusOf(iso(200))==='futura');

section('Gráfico de peso');
ok('vacío → ""', VP.weightChart([])==='');
ok('1 punto', VP.weightChart([{fecha:'2024-01-01',kg:5}]).includes('5 kg'));
ok('2 puntos (línea)', (()=>{const c=VP.weightChart([{fecha:'2024-01-01',kg:5},{fecha:'2024-06-01',kg:8}]); return c.includes('chart-line')&&c.includes('8 kg');})());

section('i18n (es/en/pt)');
const d=VP.getData();
d.lang='es'; ok('es', VP.t('tab_home')==='Inicio');
d.lang='en'; ok('en', VP.t('tab_home')==='Home');
d.lang='pt'; ok('pt', VP.t('tab_card')==='Carteira');
d.lang='es'; ok('tf interpola', VP.tf('in_days',{n:5})==='En 5 días');
ok('fallback clave inexistente', VP.t('__no__')==='__no__');

section('base64url');
const txt = JSON.stringify({n:'Rocky áéí 🐶'});
ok('roundtrip unicode', VP.b64urlDecode(VP.b64urlEncode(txt))===txt);
ok('urlB64ToUint8 [1,2,3]', (()=>{const a=VP.urlB64ToUint8('AQID'); return a[0]===1&&a[1]===2&&a[2]===3;})());

section('Sincronización (resolución de conflictos)');
ok('cloudConfigured false (vacío)', VP.cloudConfigured()===false);
ok('adopta remoto si más nuevo', VP.shouldAdoptRemote('2026-06-13T10:00Z','2026-06-13T08:00Z',{pets:[]})===true);
ok('NO adopta si local más nuevo', VP.shouldAdoptRemote('2026-06-13T08:00Z','2026-06-13T10:00Z',{pets:[]})===false);
ok('NO adopta si remoto sin pets', VP.shouldAdoptRemote('2026-06-13T10:00Z','2026-06-13T08:00Z',{})===false);

section('Asistente (motor de reglas)');
ok('clasif missing', VP.classify('¿qué le falta a mi perro?')==='missing');
ok('clasif next', VP.classify('cuándo es la próxima dosis')==='next');
ok('clasif deworm', VP.classify('cuando toca el antipulgas')==='deworm');
ok('clasif register', VP.classify('quiero registrar una vacuna')==='register');
ok('clasif explain', VP.classify('cómo funciona el recomendador')==='explain');
ok('clasif EN missing', VP.classify("what's missing")==='missing');
ok('clasif faq general', VP.classify('mi gato puede comer chocolate')==='faq');
VP.setData(Object.assign(VP.getData(),{ pets:[{info:{id:'1',nombre:'Rocky',especie:'perro'},vaccines:[{id:'a',nombre:'Rabia',fecha:'2024-01-01',proxima:iso(-2)}],dewormings:[{id:'b',tipo:'externa',producto:'Pipeta',proxima:iso(10)}],weights:[],vetVisits:[]}], activeId:'1' }));
ok('faltan = todas menos Rabia', VP.missingVaccines(VP.getData().pets[0]).length===3);
ok('whatsMissing menciona faltante', VP.aWhatsMissing().includes('Polivalente'));
ok('nextDose = próxima upcoming', VP.aNextDose().includes('Pipeta'));
ok('register → botones', VP.handleIntent('register','x').html.includes('data-chatadd'));

section('Asistente (FAQ + consentimiento)');
globalThis.window.VACUPET_AI = {};
ok('FAQ sin endpoint → local', (await VP.askFaq('duda')).includes('veterinario'));
globalThis.window.VACUPET_AI = { faqEndpoint:'http://x' }; VP.getData().faqConsent=false;
ok('FAQ sin consentimiento → pide permiso', (await VP.askFaq('duda')).includes('data-consent'));

section('Integridad del carné (QR firmado, ES256)');
{
  const KID='vacupet-1';
  const b64b = (b)=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const b64s = (s)=>b64b(Buffer.from(s,'utf8'));
  const kp = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'}, true, ['sign','verify']);
  const pub = await crypto.subtle.exportKey('jwk', kp.publicKey); pub.kid=KID; pub.use='sig'; pub.alg='ES256';
  const sign = async (payload)=>{ const h={alg:'ES256',kid:KID,typ:'JWT'}; const si=b64s(JSON.stringify(h))+'.'+b64s(JSON.stringify(payload)); const sg=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(si)); return si+'.'+b64b(new Uint8Array(sg)); };
  globalThis.fetch = async ()=>({ json: async ()=>({keys:[pub]}) });
  const pet = { info:{id:'1',nombre:'Rocky áéí',especie:'perro'}, vaccines:[{id:'a',nombre:'Rabia'}], dewormings:[] };
  const tok = await sign(pet);
  ok('token válido → verifica', (await VP.verifyIntegrity(tok,'http://x/sign'))===true);
  const p = tok.split('.');
  const tampered = p[0]+'.'+b64s(JSON.stringify({...pet,info:{...pet.info,nombre:'HACK'}}))+'.'+p[2];
  ok('token manipulado → falla', (await VP.verifyIntegrity(tampered,'http://x/sign'))===false);
  ok('firma corrupta → falla', (await VP.verifyIntegrity(p[0]+'.'+p[1]+'.'+b64b(Buffer.alloc(64,1)),'http://x/sign'))===false);
  const dec = VP.decodeShareObj({app:'vacupet',v:1,sig:tok});
  ok('decodeShareObj extrae carné firmado', dec && dec.info.nombre==='Rocky áéí' && VP.getSig()===tok);
  ok('decodeShareObj sin firma', (()=>{const x=VP.decodeShareObj({app:'vacupet',v:1,pet}); return x && VP.getSig()===null;})());
}

section('Privacidad (PIN + respaldo cifrado)');
VP.setData({ v:1, activeId:null, remDays:30, lang:'es', pets:[] });
await VP.setPin('1234');
ok('PIN guardado hasheado', !!(VP.getData().lock && VP.getData().lock.hash) && !JSON.stringify(VP.getData().lock).includes('1234'));
ok('PIN correcto', (await VP.checkPin('1234'))===true);
ok('PIN incorrecto', (await VP.checkPin('0000'))===false);
VP.setData({ v:1, activeId:'1', remDays:30, lang:'es', pets:[{info:{id:'1',nombre:'Rocky áéí',especie:'perro'},vaccines:[],dewormings:[],weights:[],vetVisits:[]}] });
const env = await VP.encryptBackup('clave');
ok('cifrado no filtra el nombre', !env.includes('Rocky'));
ok('descifra con clave correcta', (await VP.decryptBackup(env,'clave')).pets[0].info.nombre==='Rocky áéí');
ok('clave incorrecta falla', await (async()=>{ try{ await VP.decryptBackup(env,'mala'); return false; }catch(_){ return true; } })());

section('Viajero y logros');
VP.setData({ v:1, activeId:'1', remDays:30, lang:'es', pets:[{info:{id:'1',nombre:'Rocky',especie:'perro',microchip:'941000012345678'},vaccines:[{id:'a',nombre:'Rabia',fecha:iso(0),proxima:iso(200)}],dewormings:[{id:'b',tipo:'interna',fecha:iso(-10)}],weights:[{fecha:iso(0),kg:10},{fecha:iso(0),kg:11},{fecha:iso(0),kg:12}],vetVisits:[]}] });
let pet8 = VP.getData().pets[0];
ok('rabia vigente (refuerzo futuro)', VP.hasValidRabies(pet8)===true);
ok('desparasitación reciente', VP.recentDeworm(pet8)===true);
ok('req microchip=met', VP.checkReq(pet8,'microchip')==='met');
ok('req titulación=manual', VP.checkReq(pet8,'titulacion')==='manual');
ok('5 destinos', VP.DESTINOS.length===5);
ok('UE pide titulación', VP.DESTINOS.find(x=>x.key==='ue').reqs.includes('titulacion'));
ok('logro microchip', VP.achievements(pet8).find(a=>a.key==='microchip').got===true);
ok('logro tracker (3 pesos)', VP.achievements(pet8).find(a=>a.key==='tracker').got===true);
VP.setData({ v:1, activeId:'2', remDays:30, lang:'es', pets:[{info:{id:'2',nombre:'Mia',especie:'gato'},vaccines:[{id:'c',nombre:'Rabia',fecha:iso(-400)}],dewormings:[],weights:[],vetVisits:[]}] });
ok('rabia caduca NO vigente', VP.hasValidRabies(VP.getData().pets[0])===false);

section('Cuidados propios (baño, cumpleaños…)');
VP.getData().lang='es';
ok('freqLabel 30 → "Cada 30 días"', VP.freqLabel(30)==='Cada 30 días');
ok('freqLabel 365 → "Cada año"', VP.freqLabel(365)==='Cada año');
ok('freqLabel 0 → "Una vez"', VP.freqLabel(0)==='Una vez');
ok('6 tipos de cuidado', VP.CARE_KINDS.length===6);
ok('nextAnniversary devuelve fecha futura', (()=>{ const a=VP.nextAnniversary('2022-03-10'); return a>=new Date().toISOString().slice(0,10); })());
VP.setData({ v:1, activeId:'1', remDays:30, lang:'es', pets:[{info:{id:'1',nombre:'R',especie:'perro'},vaccines:[],dewormings:[],weights:[],vetVisits:[],cares:[{id:'c',kind:'bano',titulo:'Baño',fecha:iso(-10),cada:30,proxima:iso(5)}]}] });
{
  const rem = VP.reminders(VP.getData().pets[0]);
  ok('reminders incluye el cuidado', rem.some(r=>r.kind==='cuidado' && r.nombre==='Baño'));
  ok('petSummary cuenta el cuidado', VP.petSummary(VP.getData().pets[0]).aplicadas===1);
}

// =========================================================================
// Spec de las Edge Functions (lógica replicada idéntica a vacupet-push/recordatorios)
section('Edge: ventana de vencimientos (dueItems)');
{
  const today = new Date().toISOString().slice(0,10);
  const dB = (a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
  const dueItems = (state)=>{ const rem=typeof state?.remDays==='number'?state.remDays:30; const out=[];
    for(const p of (state?.pets||[])){ for(const v of (p?.vaccines||[])) if(v?.proxima && dB(today,v.proxima)<=rem) out.push(v.nombre);
      for(const x of (p?.dewormings||[])) if(x?.proxima && dB(today,x.proxima)<=rem) out.push(x.producto||'desp'); } return out; };
  const st = { remDays:30, pets:[{info:{nombre:'R'},vaccines:[{nombre:'Vencida',proxima:iso(-5)},{nombre:'Pronto',proxima:iso(10)},{nombre:'Borde',proxima:iso(30)},{nombre:'Lejos',proxima:iso(45)}],dewormings:[]}] };
  const r = dueItems(st);
  ok('incluye vencida+pronto+borde', r.includes('Vencida')&&r.includes('Pronto')&&r.includes('Borde'));
  ok('excluye lejos (>remDays)', !r.includes('Lejos'));
  ok('estado vacío → []', dueItems({}).length===0);
}

// =========================================================================
console.log(`\n${'='.repeat(48)}\nRESULTADO: ${pass} OK, ${fail} fallos\n${'='.repeat(48)}`);
process.exit(fail ? 1 : 0);
