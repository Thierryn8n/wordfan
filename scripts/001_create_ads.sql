-- Tabela de anúncios (banners patrocinados) exibidos nas páginas públicas.
-- Execute este script no seu banco Supabase (SQL Editor) para ativar o CRUD de anúncios.

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_url text,
  placement text not null default 'home_feed'
    check (placement in ('home_hero', 'home_feed', 'discover')),
  active boolean not null default true,
  position integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

-- Leitura pública dos anúncios ativos (páginas públicas)
drop policy if exists "ads_select_public" on public.ads;
create policy "ads_select_public" on public.ads
  for select using (true);

-- Apenas admins podem inserir/editar/excluir anúncios
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

create index if not exists ads_placement_active_idx on public.ads (placement, active, position);
