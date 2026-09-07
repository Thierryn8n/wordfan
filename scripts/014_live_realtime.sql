-- ============================================================================
-- 014_live_realtime.sql
-- Transforma as lives (antes placeholder) em transmissões em tempo real:
--  - colunas de stream/inicio na tabela `lives`
--  - tabela `live_messages` para o chat ao vivo (com RLS)
--  - publicação Realtime para `lives` e `live_messages` (fãs recebem em tempo real)
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================================

-- 1) Colunas de transmissão nas lives ---------------------------------------
alter table public.lives add column if not exists stream_url text;
alter table public.lives add column if not exists started_at timestamptz;

-- 2) Tabela do chat ao vivo --------------------------------------------------
create table if not exists public.live_messages (
  id         uuid primary key default gen_random_uuid(),
  live_id    uuid not null references public.lives(id) on delete cascade,
  artist_id  uuid not null references public.artists(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  author     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists live_messages_live_id_created_idx
  on public.live_messages (live_id, created_at);

alter table public.live_messages enable row level security;

-- Leitura: qualquer usuário autenticado pode acompanhar o chat da live.
drop policy if exists live_messages_select on public.live_messages;
create policy live_messages_select on public.live_messages
  for select to authenticated using (true);

-- Inserção: o usuário só pode escrever em nome de si mesmo.
drop policy if exists live_messages_insert_self on public.live_messages;
create policy live_messages_insert_self on public.live_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- Moderação/limpeza: admin, dono do artista ou empresário podem apagar.
drop policy if exists live_messages_delete_staff on public.live_messages;
create policy live_messages_delete_staff on public.live_messages
  for delete to authenticated using (
    public.is_admin()
    or public.is_artist_owner(artist_id)
    or public.is_manager(artist_id)
  );

-- 3) Realtime ----------------------------------------------------------------
-- Fãs recebem novas mensagens e mudanças de status (live começou/terminou).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_messages'
  ) then
    alter publication supabase_realtime add table public.live_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lives'
  ) then
    alter publication supabase_realtime add table public.lives;
  end if;
end $$;

-- Garante que o payload de UPDATE traga a linha completa para o cliente.
alter table public.lives replica identity full;
alter table public.live_messages replica identity full;
