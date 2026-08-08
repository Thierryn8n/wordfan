-- ============================================================
-- Tabela de ANÚNCIOS (CRUD pelo painel administrativo)
-- Rode este SQL no seu Supabase (SQL Editor) UMA vez.
-- ============================================================

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text,
  placement text not null default 'home_inline'
    check (placement in ('home_hero', 'home_inline', 'discover', 'events')),
  active boolean not null default true,
  sort_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

-- Leitura pública dos anúncios ativos (o app filtra período no servidor).
drop policy if exists "ads_public_read_active" on public.ads;
create policy "ads_public_read_active" on public.ads
  for select using (active = true);

-- Admins podem ler tudo (inclusive inativos) e gerenciar.
drop policy if exists "ads_admin_read_all" on public.ads;
create policy "ads_admin_read_all" on public.ads
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ads_admin_insert" on public.ads;
create policy "ads_admin_insert" on public.ads
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ads_admin_update" on public.ads;
create policy "ads_admin_update" on public.ads
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ads_admin_delete" on public.ads;
create policy "ads_admin_delete" on public.ads
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create index if not exists ads_placement_active_idx on public.ads (placement, active, sort_order);
