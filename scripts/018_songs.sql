-- Músicas (faixas) dos artistas + bucket de áudio.
-- Idempotente: pode ser executado mais de uma vez com segurança.

-- ============ TABELA ============
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  audio_url text not null,
  cover_url text,
  duration_seconds integer not null default 0,
  -- Ordem no Top 10 (1 = primeira). Faixas com rank menor aparecem antes.
  rank integer not null default 0,
  -- Lançamento novo em destaque no card flutuante.
  is_new_release boolean not null default false,
  -- Exclusividade: quando true, exige assinatura de tier >= min_tier.
  is_exclusive boolean not null default false,
  min_tier text check (min_tier in ('bronze','silver','gold','platinum')),
  plays_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists songs_artist_rank_idx on public.songs (artist_id, rank);
create index if not exists songs_artist_created_idx on public.songs (artist_id, created_at desc);

alter table public.songs enable row level security;

-- Leitura pública (o gating de reprodução é feito na aplicação).
drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs
  for select using (true);

-- Escrita: admin OU dono OU manager do artista.
drop policy if exists songs_manager_write on public.songs;
create policy songs_manager_write on public.songs
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.artists a
      where a.id = songs.artist_id
        and (
          a.owner_id = auth.uid()
          or exists (
            select 1 from public.managers m
            where m.artist_id = a.id and m.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.artists a
      where a.id = songs.artist_id
        and (
          a.owner_id = auth.uid()
          or exists (
            select 1 from public.managers m
            where m.artist_id = a.id and m.user_id = auth.uid()
          )
        )
    )
  );

-- ============ BUCKET DE ÁUDIO ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-audio',
  'artist-audio',
  true,
  26214400, -- 25MB
  array['audio/mpeg','audio/mp3','audio/aac','audio/mp4','audio/x-m4a','audio/wav','audio/ogg','audio/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists artist_audio_public_read on storage.objects;
create policy artist_audio_public_read on storage.objects
  for select using (bucket_id = 'artist-audio');

drop policy if exists artist_audio_manager_insert on storage.objects;
create policy artist_audio_manager_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artist-audio'
    and (
      public.is_admin()
      or exists (
        select 1 from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1 from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  );

drop policy if exists artist_audio_manager_update on storage.objects;
create policy artist_audio_manager_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'artist-audio'
    and (
      public.is_admin()
      or exists (
        select 1 from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1 from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  )
  with check (bucket_id = 'artist-audio');

drop policy if exists artist_audio_manager_delete on storage.objects;
create policy artist_audio_manager_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artist-audio'
    and (
      public.is_admin()
      or exists (
        select 1 from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1 from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  );
