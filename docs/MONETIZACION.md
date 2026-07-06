# VacuPet — Monetización (Fase 1: cimiento freemium)

Esta fase deja **montada la base** para cobrar, **apagada por defecto** con un
feature flag. Con `monetize:false`, `isPremium()` siempre devuelve `true` y la
app se comporta exactamente como hoy (nadie nota cambios).

## Qué quedó en el cliente (ya implementado)

- **Feature flag** en `supabase-config.js` → `window.VACUPET_FEATURES`:
  ```js
  window.VACUPET_FEATURES = {
    monetize: false,     // ← ponlo en true para activar el paywall
    freePetLimit: 2,     // mascotas en el plan gratis
    checkoutUrl: "",     // enlace de pago (Lemon Squeezy / Recurrente); vacío = "próximamente"
    manageUrl: "",       // portal de gestión de la suscripción
    devCode: ""          // código de desbloqueo local (pruebas / ventas manuales)
  };
  ```
- **Núcleo** (`VacuPet.html`): `monetizeOn()`, `isPremium()`, `canAddPet()`,
  `requirePremium(feature)`, `premiumPlanLabel()`.
- **Paywall** limpio (`paywallModal`), **canje de código** (`redeemModal`/`redeemCode`),
  **checkout** (`startCheckout`) y **gestión** (`premiumManageModal`).
- **Sección Premium** en *Más* (solo visible con `monetize:true`).
- **Gating** (solo actúa con el flag activo): límite de mascotas, exportar PDF,
  módulo de viaje internacional, bóveda de documentos.
- **Entitlement** local en `data.premium = { active, plan, until, source }`, que
  se refresca desde el servidor con `pullEntitlement()` al iniciar sesión.

> El modelo `data.premium` es la **copia local**. La **fuente de verdad** es el
> servidor (tabla `entitlements`). El gating del cliente es por comodidad/UX; las
> acciones premium **del servidor** (push, email, almacenamiento) deben verificar
> el entitlement en el servidor (ver "Enforcement" abajo).

---

## Esquema de base de datos (Supabase / Postgres)

```sql
-- 1) Entitlements: estado premium por usuario (lo escribe SOLO el servidor).
create table if not exists public.entitlements (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  active      boolean not null default false,
  plan        text,                         -- 'monthly' | 'yearly' | 'lifetime'
  valid_until date,                         -- null en lifetime
  provider    text,                         -- 'lemonsqueezy' | 'stripe' | 'recurrente' | 'code'
  customer_id text,
  updated_at  timestamptz not null default now()
);
alter table public.entitlements enable row level security;

-- El usuario puede LEER su propio entitlement; nadie lo escribe vía anon key
-- (solo la service role del webhook).
create policy "leer mi entitlement"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- 2) Códigos de activación (para lifetime / ventas manuales tempranas).
create table if not exists public.redeem_codes (
  code        text primary key,
  plan        text not null default 'lifetime',
  valid_until date,
  used_by     uuid references auth.users(id),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.redeem_codes enable row level security;
-- Sin políticas de select/insert para anon: solo se usan vía la función RPC.
```

```sql
-- 3) RPC para canjear un código (SECURITY DEFINER: corre con permisos elevados,
--    pero valida que haya sesión y que el código no esté usado).
create or replace function public.redeem_code(p_code text)
returns table(active boolean, plan text, valid_until date)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row redeem_codes;
begin
  if v_uid is null then raise exception 'no auth'; end if;
  select * into v_row from redeem_codes where code = p_code and used_by is null for update;
  if not found then return; end if;          -- código inexistente o ya usado
  update redeem_codes set used_by = v_uid, used_at = now() where code = p_code;
  insert into entitlements(user_id, active, plan, valid_until, provider, updated_at)
    values (v_uid, true, v_row.plan, v_row.valid_until, 'code', now())
  on conflict (user_id) do update
    set active = true, plan = excluded.plan, valid_until = excluded.valid_until,
        provider = 'code', updated_at = now();
  return query select true, v_row.plan, v_row.valid_until;
end; $$;
grant execute on function public.redeem_code(text) to authenticated;
```

> El cliente ya llama a esta RPC en `redeemCode()`. Para generar códigos:
> `insert into redeem_codes(code, plan) values ('VACU-XXXX-YYYY','lifetime');`

---

## Webhook de pago (Edge Function, Deno) — esqueleto

Crea `supabase/functions/vacupet-billing/index.ts`. Ejemplo con **Lemon Squeezy**
(merchant of record; ideal para indie/global). Verifica la firma HMAC y hace
upsert en `entitlements` con la **service role**.

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LS_SECRET    = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")!;

async function valid(req: Request, raw: string) {
  const sig = req.headers.get("X-Signature") || "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(LS_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === sig;
}

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await valid(req, raw))) return new Response("bad signature", { status: 401 });
  const evt = JSON.parse(raw);

  // Mapea el evento → estado. Pasa el user_id de Supabase como custom data
  // al crear el checkout (checkout[custom][user_id]).
  const userId = evt?.meta?.custom_data?.user_id;
  const name   = evt?.meta?.event_name;             // 'order_created', 'subscription_*'
  if (!userId) return new Response("no user", { status: 200 });

  const active = ["order_created","subscription_created","subscription_updated","subscription_resumed"]
                 .includes(name);
  const plan   = evt?.data?.attributes?.variant_name?.toLowerCase()?.includes("life") ? "lifetime"
               : evt?.data?.attributes?.variant_name?.toLowerCase()?.includes("year") ? "yearly" : "monthly";
  const until  = evt?.data?.attributes?.renews_at?.slice(0,10) ?? null;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  await sb.from("entitlements").upsert({
    user_id: userId, active, plan, valid_until: plan === "lifetime" ? null : until,
    provider: "lemonsqueezy", updated_at: new Date().toISOString(),
  });
  return new Response("ok", { status: 200 });
});
```

Despliegue (cuando tengas la cuenta de pago):
```bash
supabase functions deploy vacupet-billing --no-verify-jwt
supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=...   # firma del webhook
# En Lemon Squeezy: apuntar el webhook a /functions/v1/vacupet-billing
# En el checkout: pasar checkout[custom][user_id] = <id de Supabase del usuario>
```

> Alternativas: **Stripe** (mismo patrón, verificar `Stripe-Signature`) o
> **Recurrente** (pasarela guatemalteca) si vendes principalmente en GT.

---

## Enforcement en el servidor (importante)

El gating del cliente es UX. Para que Premium tenga valor real, las **funciones
del servidor** que cuestan dinero deben comprobar el entitlement:

- `vacupet-push` / `recordatorios` (email): antes de enviar, `select active from
  entitlements where user_id = ... and active` (y `valid_until >= today`).
- Storage (bóveda de documentos): validar en una RLS/policy o en la función que
  sube, que el usuario sea premium.

Así, aunque alguien manipule `data.premium` en el cliente, no obtiene los
servicios de servidor sin pagar.

---

## Cómo activar (cuando decidas cobrar)

1. Crear las tablas + RPC (SQL de arriba) en Supabase.
2. Desplegar `vacupet-billing` y configurar el webhook del proveedor.
3. En `supabase-config.js`: `monetize: true` y `checkoutUrl: "<tu enlace>"`.
4. (Opcional) Generar códigos en `redeem_codes` para ventas manuales / beta.
5. Añadir el enforcement de servidor en push/email/storage.

Hasta el paso 3, **todo sigue gratis y sin cambios** para los usuarios.

---

# Fase 2 — Afiliación + leads de seguro (ingreso pasivo)

Recomendaciones contextuales de socios (seguro, antiparasitarios, etc.) con
enlaces de afiliado. **Apagado por defecto** (`enabled:false` → no se muestra
nada). No envía datos: solo abre enlaces con `utm_source=vacupet`.

## Config (`supabase-config.js`)
```js
window.VACUPET_PARTNERS = {
  enabled: false,          // ← true para mostrar recomendaciones
  country: "GT",           // se cruza con offer.countries
  offers: [
    { id:"seguro-gt", type:"insurance", contexts:["home","more"], countries:["GT","*"],
      title:"Protege a tu mascota", sub:"Seguro veterinario desde QXX/mes",
      cta:"Ver planes", url:"https://socio.com/ref/TUID" },
    { id:"antipulgas", type:"product", contexts:["deworm","reminders","more"], countries:["*"],
      title:"Antipulgas y garrapatas", sub:"Pipetas y collares recomendados",
      cta:"Comprar", url:"https://tienda.com/aff/TUID" }
  ]
};
```
- `type`: `insurance` | `product` | `service` (define el icono).
- `contexts`: dónde puede aparecer — `home` (tarjeta descartable en Inicio),
  `reminders` (centro de recordatorios; `deworm` prioriza si hay desparasitación
  pendiente), `more` (sección "Recomendados").
- `countries`: `["*"]` = todos, o lista de códigos.

## Dónde aparece (no intrusivo)
- **Inicio**: una tarjeta descartable bajo el aviso de recordatorios.
- **Centro de recordatorios**: oferta contextual (prioriza antiparasitario si
  hay una desparasitación pendiente).
- **Más › Recomendados**: lista navegable + aviso de afiliados.

## Transparencia y confianza (importante)
- Cada oferta lleva la etiqueta visible **"Recomendado"**.
- La sección *Recomendados* muestra el aviso: *"Enlaces de afiliados: podemos
  ganar una comisión si compras, sin coste extra para ti. Son opcionales."*
- El usuario puede **descartar** ofertas (se guardan en `data.offersDismissed`).
- No se comparten datos de la mascota ni del usuario con el socio; el enlace solo
  lleva `utm_source`. Los clics se cuentan localmente (`vacupet:offers`) para tu
  propia analítica, sin red.

## Cómo activar
1. Firmar el/los programa(s) de afiliados (seguro, tienda) y obtener tus enlaces.
2. En `supabase-config.js`: `enabled:true` y rellenar `offers[].url`.
3. (Opcional) Segmentar por país con `countries`.

Sugerencia de socios: comparadores/aseguradoras de mascotas (alto valor por
lead) y tiendas de antiparasitarios/alimento (volumen). Empieza con 1–2 ofertas
muy relevantes; menos es más.

---

# Fase 3 — Chapas NFC/QR para el collar (producto físico)

El software ya está construido (no requiere despliegue nuevo). Vende una **chapa
NFC/QR** que enlaza a la **página de hallazgo** de la mascota.

## Lo que ya hay en la app (gratis, refuerza el propósito)
- **Modo "mascota perdida"** (`pet.lost`): recompensa, visto por última vez y
  nota. Botón *Marcar como perdido / Encontrado* desde el perfil y la chapa.
- **Página de hallazgo autocontenida** (`#e=...`): quien escanea ve un banner
  "¡Estoy perdido!", el contacto del dueño con **Llamar + WhatsApp**, recompensa
  y los **datos médicos críticos** (alergias, condiciones, grupo sanguíneo). Sin
  barra de navegación: es una página pública limpia.
- **Chapa para el collar**: genera el **QR imprimible** del enlace de hallazgo
  (sección en el perfil → *Chapa para el collar*, con copiar e imprimir).

El enlace `#e=` lleva los datos **embebidos** (funciona offline, sin servidor).
Limitación: es una foto fija — si cambias el contacto o el estado "perdido",
regeneras/reimprimes el QR.

## El producto que vendes
- **Chapa física NFC + QR grabado** (metal/silicona, resistente al agua).
  Margen de hardware. La chapa lleva el QR/NFC que abre la página de hallazgo.
- **Modelos de ingreso**:
  - Venta única de la chapa (margen físico).
  - + Suscripción del perfil de la chapa (cambiar contacto, modo perdido con
    alerta, historial de escaneos) → recurrencia.
- **Validar sin inventario**: preventa / crowdfunding antes de fabricar.

## Upgrade recomendado: chapa con enlace MUTABLE (servidor)
Para que la MISMA chapa refleje cambios sin reimprimir (cambiar teléfono, activar
"perdido" al instante, contar escaneos), usa un token estable en vez de `#e=`:

```sql
create table if not exists public.tags (
  id          text primary key,             -- id corto grabado en la chapa (ej. 'VP-7QK2')
  user_id     uuid references auth.users(id) on delete set null,
  pet_id      text,                          -- mascota vinculada
  emergency   jsonb,                         -- payload de hallazgo (igual que #e=)
  lost        boolean not null default false,
  scans       int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.tags enable row level security;
create policy "dueño gestiona su chapa" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lectura pública de la página de hallazgo (incrementa el contador de escaneos).
create or replace function public.scan_tag(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  update tags set scans = scans + 1, updated_at = now() where id = p_id
    returning emergency || jsonb_build_object('lost', lost) into v;
  return v;   -- null si no existe
end; $$;
grant execute on function public.scan_tag(text) to anon, authenticated;
```

- La chapa graba una URL corta: `https://vacupet…/#t=VP-7QK2`.
- La app, al ver `#t=`, llama a `scan_tag(id)` y pinta la misma `viewFound`.
- El dueño edita su contacto / activa "perdido" desde la app (update en `tags`),
  y la chapa ya refleja el cambio **sin reimprimir**.
- `scans` te da analítica (cuántas veces se escaneó, útil si la mascota se pierde).

## Pasos para lanzar
1. Diseñar la chapa (QR + NFC) y elegir proveedor de grabado.
2. (Para mutable) crear la tabla `tags` + `scan_tag` y añadir el lector `#t=`.
3. Tienda simple (incluso un formulario + pago manual o el checkout de la Fase 1).
4. Empaque con instrucciones: "escanéame si me encuentras".

Hasta lanzar la chapa física, el modo perdido + la página de hallazgo + el QR
imprimible **ya aportan valor** (cualquiera puede imprimir el QR en papel).

---

# Fase 4 — White-label para clínicas (Nivel 1: co-branding)

Cada clínica tiene "su" VacuPet (nombre, logo, color y contacto) y se lo regala a
sus clientes; tú cobras una cuota mensual por clínica (SaaS B2B). **Apagado por
defecto** (`enabled:false` → la app es "VacuPet" normal).

## Config (`supabase-config.js`)
```js
window.VACUPET_BRAND = {
  enabled: true,
  name: "PatitasApp",                 // reemplaza "VacuPet" en cabecera/título
  logo: "https://.../logo.svg",       // URL o data-URL (vacío = patita)
  accent: "#0EA5E9",                  // color de la clínica
  clinicName: "Clínica Patitas",
  clinicPhone: "+502 5555 0000",
  clinicWhatsApp: "50255550000",
  bookUrl: "https://patitas.com/agenda",
  web: "https://patitas.com"
};
```

## Qué cambia con la marca activa
- **Cabecera y título**: el nombre y el logo de la clínica.
- **Color de la app**: el acento de la clínica (si el usuario no eligió otro;
  el acento por especie sigue teniendo prioridad si lo activa).
- **Tarjeta "Mi clínica"** en Inicio: Llamar + WhatsApp + Agendar + Web.
- **PDF del carné**: cabecera con logo/nombre de la clínica y pie con su marca.
- **Página de hallazgo**: pie "Atendido por <clínica>".
- **Ofertas de afiliados (Fase 2) desactivadas** automáticamente (sin competencia).
- (Opcional recomendado) bundlear **Premium** (Fase 1) en el paquete de la clínica.

## Arquitectura de despliegue
- **Por clínica (recomendado para empezar)**: cada clínica = un despliegue con su
  `VACUPET_BRAND`. Lo más simple; un subdominio por clínica
  (`clinicapatitas.vacupet.app`). Aislado, sin riesgo entre clínicas.
- **Multi-tenant (con tracción)**: una sola app; la clínica se detecta por
  subdominio o `?clinic=ID` y la config se baja de una tabla `clinics`.

## Alta de una clínica (Nivel 1)
1. Pedir a la clínica: nombre, logo, color, teléfono/WhatsApp, enlace de agenda, web.
2. Crear su `supabase-config.js` con `VACUPET_BRAND` (o su entrada en `clinics`).
3. Desplegar en su subdominio (otro proyecto de Pages/Netlify reutilizando el build).
4. Entregar QR/enlace para que la clínica lo comparta con sus clientes.

## Niveles 2 y 3 (cuando haya demanda)
- **Nivel 2**: dominio propio + app instalable (TWA con icono de la clínica).
- **Nivel 3 (panel de clínica)**: tablas `clinics` + `clinic_clients` (RLS), y una
  vista de administración donde la clínica ve sus clientes, próximos recordatorios
  y envía campañas push. Es el grueso del trabajo B2B; justifícalo con clientes
  que ya pagan el Nivel 1.

## Pricing orientativo (B2B)
- Nivel 1 (co-branding): ~Q150–400/mes (USD 20–50) por clínica.
- Nivel 2: + recargo por dominio/instalable.
- Nivel 3 (panel): ~Q600+/mes, según nº de clientes.

Hasta poner `enabled:true` en un despliegue concreto, **la app pública sigue
siendo VacuPet sin cambios**.

---

# Fase A — Infra de pagos real (RevenueCat + web) · implementada

Objetivo del proyecto: **web + app móvil**. En iOS/Android, Apple/Google obligan
a su compra in-app (IAP) para lo digital. Por eso la capa de facturación es
**RevenueCat**, que unifica **App Store IAP + Google Play Billing + Web Billing**
en un solo entitlement, y la app móvil se empaqueta con **Capacitor** (reutiliza
la PWA de un solo archivo, sin reescribir).

```
  iOS (IAP) ─┐
Android(Play)─┼─► RevenueCat ─(webhook)─► Edge Fn vacupet-billing ─► tabla entitlements ─► enforcement
  Web(Stripe)─┘         └─ "premium" unificado en las 3 plataformas       (is_premium)
```

## Lo que YA quedó hecho (2026-07-06)

1. **Esquema desplegado en Supabase** (Management API):
   - `entitlements` + columnas `store`, `customer_id`, `valid_until`.
   - `redeem_codes` + RPC `redeem_code(p_code)` (canje con sesión, un solo uso).
   - Helper `is_premium(uid uuid) → boolean` (enforcement de servidor).
2. **Webhook**: Edge Function `supabase/functions/vacupet-billing/index.ts`.
   - Verifica el header `Authorization` contra el secret `BILLING_WEBHOOK_SECRET`.
   - Mapea eventos RevenueCat → `entitlements` (GRANT: INITIAL_PURCHASE/RENEWAL/
     UNCANCELLATION/PRODUCT_CHANGE/NON_RENEWING_PURCHASE; REVOKE: EXPIRATION/REFUND/
     SUBSCRIPTION_PAUSED; CANCELLATION **no** revoca hasta expirar).
   - Requiere `app_user_id` = user_id de Supabase (UUID); si no, lo ignora.
   - `verify_jwt = false` en `config.toml` (lo protege el secret).
3. **Enforcement de servidor**: `vacupet-push` solo notifica a premium **si**
   `BILLING_ENFORCE=1` (off por defecto → no rompe el push gratuito actual).
4. **Cliente**: `startCheckout(plan)` pasa `app_user_id`/`client_reference_id`/`email`
   al checkout; `premiumManageModal` con **Restaurar compra** (re-lee entitlement)
   y **Gestionar** (portal). Config `checkoutUrl`/`manageUrl` en `supabase-config.js`.

## Pasos para ACTIVAR (los haces tú cuando tengas cuentas)

1. **Crear RevenueCat** y un producto/entitlement "premium". Añadir productos:
   `vacupet_monthly`, `vacupet_yearly`, `vacupet_lifetime` (non-consumable).
2. **Web Billing** (o conectar Stripe/Lemon Squeezy) para cobrar en el navegador.
   Configurar que `client_reference_id`/`app_user_id` se propague como el
   `app_user_id` de RevenueCat (para que el webhook sepa a quién conceder).
3. **Webhook en RevenueCat** → URL `https://<ref>.functions.supabase.co/vacupet-billing`,
   header `Authorization: <valor secreto>`. Desplegar la función:
   `supabase functions deploy vacupet-billing` y fijar el secret:
   `supabase secrets set BILLING_WEBHOOK_SECRET=<valor secreto>`.
4. **Probar en sandbox** (compra de prueba) → ver fila en `entitlements` → la app
   muestra Premium tras `pullEntitlement()`.
5. **Encender**: en `supabase-config.js` `monetize:true` + `checkoutUrl`/`manageUrl`;
   en Supabase `BILLING_ENFORCE=1`. Publicar **ToS + Política de reembolsos**.

## Móvil (Capacitor + RevenueCat) — fase siguiente
- `npx cap init`, envolver `VacuPet.html`, plugin `@revenuecat/purchases-capacitor`.
- Al iniciar sesión: `Purchases.logIn(session.user.id)` → app_user_id = UUID Supabase.
- Android primero (Play $25), luego iOS (Apple $99/año). Mismo webhook, misma tabla.
- **Chapas NFC** = pago externo web (bien físico, NO IAP). **Clínicas** = factura.

> Nada de esto afecta a los usuarios hasta poner `monetize:true`. Todo el gating
> del cliente es UX; la verdad está en `entitlements` (servidor).
