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
