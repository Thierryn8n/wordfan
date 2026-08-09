-- Bucket e políticas para uploads de avatar, banner e conteúdo dos artistas.
-- Pode ser executado mais de uma vez com segurança no SQL Editor do Supabase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-media',
  'artist-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists artist_media_public_read on storage.objects;
create policy artist_media_public_read on storage.objects
  for select using (bucket_id = 'artist-media');

drop policy if exists artist_media_manager_insert on storage.objects;
create policy artist_media_manager_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artist-media'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1
              from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  );

drop policy if exists artist_media_manager_update on storage.objects;
create policy artist_media_manager_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'artist-media'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1
              from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  )
  with check (bucket_id = 'artist-media');

drop policy if exists artist_media_manager_delete on storage.objects;
create policy artist_media_manager_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artist-media'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.artists a
        where a.slug = (storage.foldername(name))[1]
          and (
            a.owner_id = auth.uid()
            or exists (
              select 1
              from public.managers m
              where m.artist_id = a.id and m.user_id = auth.uid()
            )
          )
      )
    )
  );
