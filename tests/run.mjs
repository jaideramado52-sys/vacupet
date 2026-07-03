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
// `navigator` existe como global en Node ≥21 (sin serviceWorker), pero NO en Node 20.
// Lo stubeamos solo si falta, para que el registro del SW se omita sin lanzar.
if(typeof globalThis.navigator === 'undefined'){ globalThis.navigator = { userAgent:'node-test', onLine:true }; }

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
  nextAnniversary, freqLabel, CARE_KINDS, weightStatus,
  buildTimeline, medFreqLabel, migrate, SCHEMA_VERSION,
  allReminders, COUNTRIES, rabiesMonths,
  isPremium, canAddPet, monetizeOn, freePetLimit,
  partnersOn, partnerOffers, topOffer,
  emergencyPayload, decodeEmergency, isLost, telLink, waLink,
  brandOn, appName, hasClinic,
  lifeStageFromMonths, humanAgeYears, searchToxics, tipOfDay, rationKcal, rationGrams, guideFor,
  expensesTotal, caregiverPayload, decodeCare,
  ACCENTS, accentColor, SPECIES_COLOR, albumHTML, docsHTML,
  getData:()=>data, setData:d=>{data=d}
};`;
(0, eval)(code);
const VP = globalThis.__VP;

// --- Mini runner ---
let pass = 0, fail = 0;
const section = (n) => console.log('\n— ' + n);
const ok = (n, c) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n); } };
// Fecha LOCAL (igual que toISO() de la app) para evitar desfases de zona horaria
// en el límite de medianoche (la app usa fechas locales en todos lados).
const iso = (d) => { const x = new Date(Date.now() + d * 86400000); const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,'0'), da = String(x.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };

// =========================================================================
section('Esquema vacunal por especie');
ok('serie cachorro (+21d)', VP.suggestProxima('perro','Polivalente (quíntuple/séxtuple)','2024-01-01','2023-11-01')==='2024-01-22');
ok('refuerzo adulto (+12m)', VP.suggestProxima('perro','Rabia','2024-01-01','2020-01-01')==='2025-01-01');
ok('gato FVRCP existe', !!VP.schemeRule('gato','Trivalente felina (FVRCP)'));
ok('vacuna desconocida → sin sugerencia', VP.suggestProxima('perro','Inventada','2024-01-01','2020-01-01')==='');
ok('deworm interna +3m', VP.suggestDeworm('interna','2024-01-15')==='2024-04-15');
ok('deworm externa +1m', VP.suggestDeworm('externa','2024-01-15')==='2024-02-15');
ok('opciones de perro incluyen sugerencia GT (Óctuple)', VP.vaccineOptions('perro').includes('Óctuple'));
ok('opciones incluyen las del esquema (Rabia)', VP.vaccineOptions('perro').includes('Rabia'));

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
d.lang='pt'; ok('pt', VP.t('tab_card')==='Saúde');
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

section('Asistente (FAQ con LLM local / WebLLM)');
VP.getData().lang='es';
// En Node no hay WebGPU → la FAQ deriva al veterinario (degradación elegante).
{
  const r = await VP.askFaq('mi gato puede comer chocolate');
  ok('FAQ sin WebGPU → deriva al veterinario', r.includes('veterinario'));
  ok('FAQ devuelve string no vacío', typeof r === 'string' && r.length > 0);
}

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
ok('7 tipos de cuidado (incl. cita)', VP.CARE_KINDS.length===7 && VP.CARE_KINDS.some(k=>k.key==='cita'));
ok('nextAnniversary devuelve fecha futura', (()=>{ const a=VP.nextAnniversary('2022-03-10'); return a>=new Date().toISOString().slice(0,10); })());

section('Peso objetivo (alerta)');
ok('sin objetivo → null', VP.weightStatus(28,'','')===null);
ok('sin peso → null', VP.weightStatus('',25,30)===null);
ok('dentro de rango → ok', VP.weightStatus(28,25,30)==='ok');
ok('por debajo → low', VP.weightStatus(22,25,30)==='low');
ok('por encima → high', VP.weightStatus(33,25,30)==='high');
ok('solo máximo, excede → high', VP.weightStatus(33,'',30)==='high');
ok('límite exacto inferior → ok', VP.weightStatus(25,25,30)==='ok');

section('Medicación y recordatorios');
VP.getData().lang='es';
ok('medFreqLabel cada día', VP.medFreqLabel({cada:1})==='Cada día');
ok('medFreqLabel 2× al día', VP.medFreqLabel({veces:2})==='2× al día');
ok('medFreqLabel una vez', VP.medFreqLabel({cada:0})==='Una vez');
{
  const pet={ vaccines:[], dewormings:[], weights:[], vetVisits:[], cares:[],
    meds:[ {id:'m1',nombre:'Carprofeno',cada:1,proxima:iso(2),activo:true},
           {id:'m2',nombre:'Viejo',cada:1,proxima:iso(-3),activo:false} ] };
  const rem=VP.reminders(pet);
  ok('reminders incluye med activo', rem.some(r=>r.kind==='medicación'&&r.nombre==='Carprofeno'));
  ok('reminders excluye med inactivo', !rem.some(r=>r.nombre==='Viejo'));
  ok('petSummary cuenta meds (2)', VP.petSummary(pet).aplicadas===2);
}

section('Línea de tiempo unificada');
{
  const pet={ vaccines:[{id:'v',nombre:'Rabia',fecha:'2024-01-10',dosis:'1ª'}],
    dewormings:[{id:'d',tipo:'externa',producto:'Pipeta',fecha:'2024-03-01'}],
    weights:[{id:'w',fecha:'2024-02-01',kg:5}],
    vetVisits:[{id:'vi',fecha:'2024-04-01',motivo:'Chequeo',clinica:'X'}],
    meds:[{id:'m',nombre:'Med',inicio:'2024-05-01',dosis:'1'}],
    cares:[{id:'c',kind:'bano',titulo:'Baño',fecha:'2024-01-20'}] };
  const tl=VP.buildTimeline(pet);
  ok('timeline incluye los 6 eventos', tl.length===6);
  ok('timeline orden descendente (más reciente primero)', tl[0].fecha==='2024-05-01' && tl[tl.length-1].fecha==='2024-01-10');
  ok('timeline marca el tipo', tl.find(e=>e.kind==='visita').titulo==='Chequeo');
}

section('Migración versionada del esquema');
{
  // Documento antiguo (v1) sin owner ni meds.
  const old = { v:1, lang:'es', remDays:30, activeId:'1',
    pets:[{ info:{id:'1',nombre:'R',especie:'perro'}, vaccines:[], dewormings:[] }] };
  const m = VP.migrate(old);
  ok('sube a SCHEMA_VERSION', m.v===VP.SCHEMA_VERSION && VP.SCHEMA_VERSION===5);
  ok('añade owner', m.owner && typeof m.owner==='object');
  ok('añade pais por defecto (GT)', m.pais==='GT');
  ok('añade meds a la mascota', Array.isArray(m.pets[0].meds));
  ok('añade symptoms y expenses', Array.isArray(m.pets[0].symptoms) && Array.isArray(m.pets[0].expenses));
  ok('preserva datos existentes', m.pets[0].info.nombre==='R' && m.lang==='es');
  ok('idempotente (2ª pasada estable)', VP.migrate(VP.migrate(old)).v===VP.SCHEMA_VERSION);
  ok('basura → defaults con versión', VP.migrate(null).v===VP.SCHEMA_VERSION);
}

section('Esquema vacunal por país (normativa de rabia)');
{
  const d=VP.getData();
  d.pais='GT';
  ok('rabia GT = 12 meses', VP.rabiesMonths()===12);
  ok('sugerencia rabia GT (+12m)', VP.suggestProxima('perro','Rabia','2024-01-01','2020-01-01')==='2025-01-01');
  d.pais='US';
  ok('rabia US = 36 meses', VP.rabiesMonths()===36);
  ok('sugerencia rabia US (+36m)', VP.suggestProxima('perro','Rabia','2024-01-01','2020-01-01')==='2027-01-01');
  ok('serie de cachorro NO cambia por país', VP.suggestProxima('perro','Polivalente (quíntuple/séxtuple)','2024-01-01','2023-11-01')==='2024-01-22');
  // rabia aplicada hace 500 días: caduca en GT (12m) pero vigente en US (36m)
  const petR={ vaccines:[{id:'x',nombre:'Rabia',fecha:iso(-500)}] };
  d.pais='GT'; ok('rabia -500d caduca en GT', VP.hasValidRabies(petR)===false);
  d.pais='US'; ok('rabia -500d vigente en US', VP.hasValidRabies(petR)===true);
  ok('país inválido → cae a GT', (()=>{ d.pais='ZZ'; const r=VP.rabiesMonths(); d.pais='GT'; return r===12; })());
  d.pais='GT';
}

section('Centro de recordatorios (todas las mascotas)');
{
  VP.setData({ v:4, pais:'GT', lang:'es', remDays:30, activeId:'1', pets:[
    { info:{id:'1',nombre:'Rocky',especie:'perro'}, vaccines:[{id:'a',nombre:'Rabia',fecha:iso(-10),proxima:iso(-2)}], dewormings:[], weights:[], vetVisits:[], cares:[], meds:[] },
    { info:{id:'2',nombre:'Luna',especie:'gato'}, vaccines:[{id:'b',nombre:'FVRCP',fecha:iso(-10),proxima:iso(5)}], dewormings:[], weights:[], vetVisits:[], cares:[], meds:[] },
  ] });
  const all=VP.allReminders();
  ok('agrega ambas mascotas', all.length===2);
  ok('ordenado por fecha asc', all[0].fecha<all[1].fecha);
  ok('incluye nombre de la mascota', all[0].petName==='Rocky' && all[0].status==='vencida');
  ok('segunda es próxima', all[1].petName==='Luna' && all[1].status==='proxima');
}

section('Monetización (freemium, feature flag)');
{
  const w = globalThis.window;
  // Flag APAGADO → todo desbloqueado (comportamiento actual, no rompe nada)
  delete w.VACUPET_FEATURES;
  VP.setData({ v:4, pais:'GT', lang:'es', remDays:30, pets:[{info:{id:'1'}},{info:{id:'2'}},{info:{id:'3'}}] });
  ok('flag off → monetizeOn false', VP.monetizeOn()===false);
  ok('flag off → isPremium true', VP.isPremium()===true);
  ok('flag off → canAddPet true (sin límite)', VP.canAddPet()===true);
  // Flag ENCENDIDO, usuario gratis
  w.VACUPET_FEATURES = { monetize:true, freePetLimit:2 };
  VP.setData({ v:4, pais:'GT', lang:'es', remDays:30, pets:[] });
  ok('flag on, gratis → isPremium false', VP.isPremium()===false);
  ok('límite respeta config (2)', VP.freePetLimit()===2);
  ok('bajo el límite → canAddPet true', VP.canAddPet()===true);
  VP.getData().pets=[{info:{id:'1'}},{info:{id:'2'}}];
  ok('en el límite → canAddPet false', VP.canAddPet()===false);
  // Premium lifetime
  VP.getData().premium = { active:true, plan:'lifetime' };
  ok('premium → isPremium true', VP.isPremium()===true);
  ok('premium → canAddPet true (ilimitado)', VP.canAddPet()===true);
  // Suscripción expirada vs vigente
  VP.getData().premium = { active:true, plan:'monthly', until: iso(-1) };
  ok('suscripción expirada → isPremium false', VP.isPremium()===false);
  VP.getData().premium = { active:true, plan:'monthly', until: iso(10) };
  ok('suscripción vigente → isPremium true', VP.isPremium()===true);
  delete w.VACUPET_FEATURES; // restaurar para el resto de la suite
}

section('Partners / recomendaciones (afiliación, feature flag)');
{
  const w = globalThis.window;
  delete w.VACUPET_PARTNERS;
  VP.setData({ v:4, pais:'GT', lang:'es', remDays:30, pets:[] });
  ok('flag off → partnersOn false', VP.partnersOn()===false);
  ok('flag off → sin ofertas', VP.partnerOffers('home').length===0);
  // Encendido con dos ofertas
  w.VACUPET_PARTNERS = { enabled:true, country:'GT', offers:[
    { id:'seguro', type:'insurance', contexts:['home','more'], countries:['GT','*'], title:'Seguro', sub:'', cta:'Ver', url:'https://ej.com/seguro' },
    { id:'flea',   type:'product',   contexts:['deworm'],       countries:['MX'],     title:'Antipulgas', sub:'', cta:'Comprar', url:'https://ej.com/flea' },
    { id:'sinurl', type:'product',   contexts:['home'],         countries:['*'],      title:'Sin URL', sub:'', cta:'x', url:'' },
  ]};
  ok('home devuelve la oferta de seguro', VP.topOffer('home') && VP.topOffer('home').id==='seguro');
  ok('filtra por país (flea es MX, usuario GT)', VP.partnerOffers('deworm').length===0);
  ok('ignora ofertas sin url', !VP.partnerOffers('home').some(o=>o.id==='sinurl'));
  ok('contexto inexistente → vacío', VP.partnerOffers('xyz').length===0);
  // Descartada por el usuario
  VP.getData().offersDismissed = ['seguro'];
  ok('respeta descartadas', VP.topOffer('home')===null);
  delete w.VACUPET_PARTNERS; // restaurar
}

section('Mascota perdida + página de hallazgo (Fase 3)');
{
  ok('isLost true', VP.isLost({lost:{active:true}})===true);
  ok('isLost false (sin lost)', VP.isLost({})===false);
  ok('isLost false (active false)', VP.isLost({lost:{active:false}})===false);
  ok('telLink limpia el número', VP.telLink('+502 5555 1234')==='tel:+50255551234');
  ok('waLink quita el +', VP.waLink('+502 5555 1234')==='https://wa.me/50255551234');
  ok('telLink vacío → ""', VP.telLink('')==='');
  VP.setData({ v:4, lang:'es', remDays:30, owner:{ nombre:'Ana', telefono:'+502 5555 1234', altNombre:'Carlos', altTelefono:'5555 9876' }, pets:[] });
  const pet={ info:{ nombre:'Rocky', especie:'perro', raza:'Labrador', alergias:'Pollo', microchip:'941' }, lost:{ active:true, reward:'Q500', lastSeen:'Zona 10', note:'collar rojo' } };
  const pl=VP.emergencyPayload(pet);
  ok('payload lleva identidad', pl.n==='Rocky' && pl.sp==='perro');
  ok('payload lleva contacto del dueño', pl.on==='Ana' && pl.op==='+502 5555 1234');
  ok('payload lleva estado perdido', pl.lost && pl.lost.rw==='Q500' && pl.lost.ls==='Zona 10');
  // Round-trip por el enlace (#e=): codifica → decodifica
  const dec = VP.decodeEmergency(VP.b64urlEncode(JSON.stringify(pl)));
  ok('decode round-trip', dec && dec.n==='Rocky' && dec.al==='Pollo' && dec.lost.nt==='collar rojo');
  ok('decode rechaza basura', VP.decodeEmergency('xxx')===null);
  // No perdido → sin bloque lost
  ok('sin perdido no incluye lost', !VP.emergencyPayload({info:{nombre:'X',especie:'gato'}}).lost);
}

section('Marca blanca / co-branding (Fase 4 Nivel 1, feature flag)');
{
  const w = globalThis.window;
  delete w.VACUPET_BRAND;
  ok('flag off → brandOn false', VP.brandOn()===false);
  ok('flag off → appName VacuPet', VP.appName()==='VacuPet');
  ok('flag off → hasClinic false', VP.hasClinic()===false);
  // Con marca de clínica
  w.VACUPET_BRAND = { enabled:true, name:'PatitasApp', accent:'#0EA5E9', clinicName:'Clínica Patitas', clinicPhone:'+502 5555 0000' };
  ok('brandOn true', VP.brandOn()===true);
  ok('appName usa el nombre de marca', VP.appName()==='PatitasApp');
  ok('hasClinic true (hay contacto)', VP.hasClinic()===true);
  // Marca apaga las ofertas de afiliados
  w.VACUPET_PARTNERS = { enabled:true, country:'GT', offers:[{ id:'x', contexts:['home'], countries:['*'], title:'X', url:'https://e.com' }] };
  VP.setData({ v:4, lang:'es', remDays:30, pets:[] });
  ok('marca apaga partnersOn', VP.partnersOn()===false);
  ok('marca → sin ofertas', VP.partnerOffers('home').length===0);
  // Sin nombre de marca → cae a VacuPet
  w.VACUPET_BRAND = { enabled:true };
  ok('marca sin nombre → VacuPet', VP.appName()==='VacuPet');
  delete w.VACUPET_BRAND; delete w.VACUPET_PARTNERS; // restaurar
}

section('Herramientas y contenido (Lote 1)');
{
  // Etapa de vida
  ok('perro 6m → cachorro', VP.lifeStageFromMonths('perro',6)==='cachorro');
  ok('perro 3a → adulto', VP.lifeStageFromMonths('perro',36)==='adulto');
  ok('perro 9a → senior', VP.lifeStageFromMonths('perro',108)==='senior');
  ok('gato 8a → adulto (senior a los 10)', VP.lifeStageFromMonths('gato',96)==='adulto');
  ok('gato 12a → senior', VP.lifeStageFromMonths('gato',144)==='senior');
  // Edad humana
  ok('perro 1a ≈ 15 humanos', VP.humanAgeYears('perro',1)===15);
  ok('perro 2a ≈ 24 humanos', VP.humanAgeYears('perro',2)===24);
  ok('perro 5a ≈ 39 humanos', VP.humanAgeYears('perro',5)===39);
  ok('gato 5a ≈ 36 humanos', VP.humanAgeYears('gato',5)===36);
  // Tóxicos
  ok('busca chocolate', VP.searchToxics('chocolate','perro').some(x=>x.n==='Chocolate'));
  ok('uvas no aplica a gato', !VP.searchToxics('uvas','gato').some(x=>x.n==='Uvas y pasas'));
  ok('lirio aplica a gato', VP.searchToxics('lirio','gato').some(x=>/[Ll]irio/.test(x.n)));
  ok('sin query devuelve lista', VP.searchToxics('','perro').length>0);
  // Consejo del día (determinista)
  ok('tipOfDay determinista', VP.tipOfDay(0)===VP.tipOfDay(0) && typeof VP.tipOfDay(0)==='string');
  ok('tipOfDay envuelve', VP.tipOfDay(-1)===VP.tipOfDay(-1));
  // Ración
  ok('rationKcal 10kg normal ≈ 630', Math.abs(VP.rationKcal(10,1.6)-630)<=2);
  ok('rationKcal 0 → 0', VP.rationKcal(0,1.6)===0);
  ok('rationGrams 630/350 ≈ 180', VP.rationGrams(630,350)===180);
  // Guías
  ok('guía perro senior tiene items', VP.guideFor('perro','senior').length>=3);
  ok('guía especie desconocida cae a otro', VP.guideFor('dragon','adulto').length>=1);
}

section('Herramientas por-mascota (Lote 2)');
{
  const exps=[{fecha:iso(-5),monto:100},{fecha:iso(-40),monto:50},{fecha:'2000-01-01',monto:999}];
  ok('total sin filtro suma todo', VP.expensesTotal(exps)===1149);
  const mS=iso(0).slice(0,7)+'-01';
  ok('total del mes filtra por fecha', VP.expensesTotal([{fecha:mS,monto:100},{fecha:'2000-01-01',monto:999}],mS)===100);
  ok('total vacío = 0', VP.expensesTotal([])===0);
  // Modo cuidador: payload + round-trip
  VP.setData({ v:5, lang:'es', remDays:30, owner:{nombre:'Ana',telefono:'+502 5555 1234'}, pets:[] });
  const pet={ info:{nombre:'Rocky',especie:'perro',alergias:'Pollo',veterinario:'Patitas'}, feedNote:'1 taza mañana y noche',
    meds:[{nombre:'Carprofeno',dosis:'50 mg',cada:1,hora:'08:00',activo:true},{nombre:'Viejo',activo:false}],
    cares:[{titulo:'Baño',proxima:iso(5)},{titulo:'Sin fecha'}] };
  const cp=VP.caregiverPayload(pet);
  ok('payload cuidador: identidad + feed', cp.n==='Rocky' && cp.feed==='1 taza mañana y noche');
  ok('payload cuidador: solo meds activos', cp.meds.length===1 && cp.meds[0].n==='Carprofeno');
  ok('payload cuidador: solo cuidados con fecha', cp.cares.length===1 && cp.cares[0].t==='Baño');
  ok('payload cuidador: contacto del dueño', cp.on==='Ana' && cp.op==='+502 5555 1234');
  const dec=VP.decodeCare(VP.b64urlEncode(JSON.stringify(cp)));
  ok('decode cuidador round-trip', dec && dec.n==='Rocky' && dec.meds[0].n==='Carprofeno');
  ok('decode cuidador rechaza basura', VP.decodeCare('zzz')===null);
}

VP.setData({ v:1, activeId:'1', remDays:30, lang:'es', pets:[{info:{id:'1',nombre:'R',especie:'perro'},vaccines:[],dewormings:[],weights:[],vetVisits:[],cares:[{id:'c',kind:'bano',titulo:'Baño',fecha:iso(-10),cada:30,proxima:iso(5)}]}] });
{
  const rem = VP.reminders(VP.getData().pets[0]);
  ok('reminders incluye el cuidado', rem.some(r=>r.kind==='cuidado' && r.nombre==='Baño'));
  ok('petSummary cuenta el cuidado', VP.petSummary(VP.getData().pets[0]).aplicadas===1);
}

section('Álbum y documentos');
{
  const pet = { info:{id:'1',nombre:'R',especie:'perro'}, album:[{id:'a',img:'data:img',fecha:iso(-10)}], docs:[{id:'d',name:'analitica.pdf',mime:'application/pdf',data:'data:pdf',fecha:iso(-5)}] };
  VP.setData({ v:1, activeId:'1', remDays:30, lang:'es', pets:[pet] });
  const al = VP.albumHTML(pet);
  ok('álbum muestra thumb + botón añadir', al.includes('data-photo="a"') && al.includes('albumAdd'));
  const dc = VP.docsHTML(pet);
  ok('documentos lista el archivo', dc.includes('analitica.pdf') && dc.includes('data-opendoc="d"'));
  ok('documentos vacío sigue ofreciendo adjuntar', VP.docsHTML({docs:[]}).includes('docAdd'));
}

section('Personalización (acento + especie)');
ok('6 acentos', VP.ACCENTS.length===6);
VP.getData().accent='morado'; ok('accentColor morado', VP.accentColor()==='#7C3AED');
VP.getData().accent=undefined; ok('accentColor por defecto null', VP.accentColor()===null);
ok('color por especie (gato)', VP.SPECIES_COLOR.gato==='#7C3AED');

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
