-- Ad banners para anúncios na home (CRUD gerenciado pelo admin)
create table if not exists public.ad_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  image_url text,
  cta_label text,
  cta_url text,
  placement text not null default 'home_hero', -- home_hero | home_inline | home_footer
  accent_color text default '#ff6b00',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_banners_placement_active_idx
  on public.ad_banners (placement, is_active, sort_order);

alter table public.ad_banners enable row level security;

-- Público vê banners ativos; admin vê tudo
drop policy if exists ad_banners_select on public.ad_banners;
create policy ad_banners_select on public.ad_banners
  for select using (is_active or is_admin());

drop policy if exists ad_banners_insert_admin on public.ad_banners;
create policy ad_banners_insert_admin on public.ad_banners
  for insert with check (is_admin());

drop policy if exists ad_banners_update_admin on public.ad_banners;
create policy ad_banners_update_admin on public.ad_banners
  for update using (is_admin());

drop policy if exists ad_banners_delete_admin on public.ad_banners;
create policy ad_banners_delete_admin on public.ad_banners
  for delete using (is_admin());

-- Métricas (contagem pública via security definer)
create or replace function public.increment_banner_click(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.ad_banners set clicks = clicks + 1 where id = p_id and is_active;
$$;

create or replace function public.increment_banner_impressions(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.ad_banners set impressions = impressions + 1 where id = any(p_ids) and is_active;
$$;

grant execute on function public.increment_banner_click(uuid) to anon, authenticated;
grant execute on function public.increment_banner_impressions(uuid[]) to anon, authenticated;
