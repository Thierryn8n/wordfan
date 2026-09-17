-- Contratos gerados por IA + dados legais da empresa e do artista.
-- Idempotente: pode rodar mais de uma vez no SQL Editor do Supabase.

-- 1) Dados legais / cadastrais da empresa (singleton). Uma linha só.
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text,
  cnpj text,
  address text,
  city text,
  state text,
  zip text,
  email text,
  phone text,
  logo_url text,
  singleton boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Garante no máximo uma linha de configuração da empresa.
create unique index if not exists company_settings_singleton_idx
  on public.company_settings (singleton);

-- 2) Colunas legais do artista (preenchidas só no fluxo admin-local).
alter table public.artists add column if not exists legal_name text;
alter table public.artists add column if not exists legal_document text;
alter table public.artists add column if not exists legal_address text;
alter table public.artists add column if not exists legal_city text;
alter table public.artists add column if not exists legal_state text;
alter table public.artists add column if not exists legal_zip text;

-- 3) Contratos por artista.
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  status text not null default 'pending' check (status in ('draft', 'pending', 'signed')),
  title text not null default 'Contrato de Prestação de Serviços',
  content_md text,
  pdf_path text,
  plan text not null default 'basico' check (plan in ('basico', 'pro', 'premium')),
  commission_pct numeric not null default 20,
  plan_values jsonb not null default '[]'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  artist_snapshot jsonb not null default '{}'::jsonb,
  signer_name text,
  signer_ip text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_artist_idx on public.contracts (artist_id);

-- 4) RLS
alter table public.company_settings enable row level security;
alter table public.contracts enable row level security;

-- company_settings: leitura por qualquer autenticado (o PDF/contrato mostra os dados);
-- escrita apenas admin.
drop policy if exists company_settings_read on public.company_settings;
create policy company_settings_read on public.company_settings
  for select to authenticated using (true);

drop policy if exists company_settings_admin_write on public.company_settings;
create policy company_settings_admin_write on public.company_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- contracts: admin acesso total; artista dono pode ler e assinar o próprio.
drop policy if exists contracts_admin_all on public.contracts;
create policy contracts_admin_all on public.contracts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists contracts_owner_read on public.contracts;
create policy contracts_owner_read on public.contracts
  for select to authenticated using (
    exists (
      select 1 from public.artists a
      where a.id = contracts.artist_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists contracts_owner_sign on public.contracts;
create policy contracts_owner_sign on public.contracts
  for update to authenticated using (
    exists (
      select 1 from public.artists a
      where a.id = contracts.artist_id and a.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.artists a
      where a.id = contracts.artist_id and a.owner_id = auth.uid()
    )
  );

-- 5) Bucket privado para os PDFs dos contratos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists contracts_pdf_admin_all on storage.objects;
create policy contracts_pdf_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'contracts' and public.is_admin())
  with check (bucket_id = 'contracts' and public.is_admin());

drop policy if exists contracts_pdf_owner_read on storage.objects;
create policy contracts_pdf_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contracts'
    and exists (
      select 1 from public.artists a
      where a.id::text = (storage.foldername(name))[1] and a.owner_id = auth.uid()
    )
  );
