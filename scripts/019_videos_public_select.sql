-- Alinha a leitura de vídeos à de posts: o público vê vídeos NÃO exclusivos;
-- os exclusivos exigem tier suficiente, ou ser dono/manager/admin do artista.
-- Antes, videos_select_auth exigia login (auth.uid() IS NOT NULL), o que
-- escondia todos os vídeos de visitantes anônimos.

drop policy if exists videos_select_auth on videos;
drop policy if exists videos_select on videos;

create policy videos_select on videos
  for select
  using (
    (not is_exclusive)
    or is_admin()
    or exists (
      select 1 from artists a
      where a.id = videos.artist_id and a.owner_id = auth.uid()
    )
    or is_manager(artist_id)
    or has_tier_access(artist_id, min_tier)
  );
