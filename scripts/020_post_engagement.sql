-- Engajamento de posts: curtir e comentar de verdade.
-- As tabelas post_likes / post_comments já existem com RLS (select público,
-- insert/delete pelo próprio usuário). Aqui garantimos:
--   1. contagem de curtidas (posts.likes_count) sempre sincronizada via trigger
--   2. leitura dos comentários com nome/avatar do autor via RPC security definer
--      (a policy de profiles é own_or_admin, então precisamos da função para
--       expor apenas display_name + avatar dos autores publicamente)

-- ============ 1. Sincroniza posts.likes_count ============
create or replace function sync_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_likes on post_likes;
create trigger trg_sync_post_likes
  after insert or delete on post_likes
  for each row execute function sync_post_likes_count();

-- Corrige contagens já existentes.
update posts p
set likes_count = (select count(*) from post_likes l where l.post_id = p.id);

-- ============ 2. Comentários com autor (RPC pública) ============
create or replace function get_post_comments(p_post_id uuid)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  user_id uuid,
  author_name text,
  author_avatar text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    coalesce(pr.display_name, 'Fã') as author_name,
    pr.avatar_url as author_avatar
  from post_comments c
  left join profiles pr on pr.id = c.user_id
  where c.post_id = p_post_id
  order by c.created_at asc
$$;

grant execute on function get_post_comments(uuid) to anon, authenticated;
