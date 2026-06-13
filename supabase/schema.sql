-- VacuPet — Esquema de base de datos (idempotente).
-- Ejecuta este archivo completo en Supabase → SQL Editor.
-- Cubre: sincronización en la nube, compartir por enlace seguro, push y fotos.
-- (Fase 3 y 4 del ROADMAP.)

-- =====================================================================
-- 1) Estado del usuario (sincronización multidispositivo)
--    Espejo del JSON local `vacupet:data:v1`.
-- =====================================================================
create table if not exists public.vacupet_state (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  data           jsonb not null default '{}'::jsonb,
  last_notified  date,            -- antiduplicado del correo (función recordatorios)
  last_pushed    date,            -- antiduplicado del push   (función vacupet-push)
  updated_at     timestamptz default now()
);
alter table public.vacupet_state add column if not exists last_notified date;
alter table public.vacupet_state add column if not exists last_pushed   date;

alter table public.vacupet_state enable row level security;
drop policy if exists "own state" on public.vacupet_state;
create policy "own state" on public.vacupet_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- 2) Compartir carné por enlace seguro (token que caduca, sin datos en la URL)
-- =====================================================================
create table if not exists public.shares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);
alter table public.shares enable row level security;
drop policy if exists "own shares" on public.shares;
create policy "own shares" on public.shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lectura pública SOLO vía RPC (token), si no ha caducado. SECURITY DEFINER.
create or replace function public.get_share(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.shares
  where id = p_token and expires_at > now()
  limit 1;
$$;
grant execute on function public.get_share(uuid) to anon, authenticated;

-- =====================================================================
-- 3) Suscripciones push (recordatorios reales, vacupet-push)
-- =====================================================================
create table if not exists public.push_subs (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  sub         jsonb not null,
  lang        text default 'es',
  created_at  timestamptz default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- 4) Almacenamiento de fotos del carné/mascota (bucket privado "mascotas")
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('mascotas', 'mascotas', false)
on conflict (id) do nothing;

-- Cada usuario gestiona sólo su carpeta (prefijo = su user_id).
drop policy if exists "mascotas own read"   on storage.objects;
drop policy if exists "mascotas own write"  on storage.objects;
drop policy if exists "mascotas own delete" on storage.objects;
create policy "mascotas own read" on storage.objects for select
  using (bucket_id = 'mascotas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mascotas own write" on storage.objects for insert
  with check (bucket_id = 'mascotas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mascotas own delete" on storage.objects for delete
  using (bucket_id = 'mascotas' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 5) (Opcional) Esquema vacunal por especie — referencia del motor.
--    Datos ORIENTATIVOS. Ver docs/ESQUEMA_VACUNAL.md. Lectura pública.
-- =====================================================================
create table if not exists public.esquema_especie (
  id                bigint generated always as identity primary key,
  especie           text not null,         -- 'perro' | 'gato' | 'generico'
  vacuna            text not null,
  dosis_n           int,
  edad_inicio_sem   int,
  intervalo_sem     int,
  refuerzo_meses    int,
  categoria         text,                  -- 'core' | 'noncore'
  pais_obligatoria  text[]
);
alter table public.esquema_especie enable row level security;
drop policy if exists "esquema public read" on public.esquema_especie;
create policy "esquema public read" on public.esquema_especie
  for select using (true);
