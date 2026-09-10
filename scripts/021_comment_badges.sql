-- Estende get_post_comments para incluir o selo de assinante do autor do comentário.
-- O selo reflete a MELHOR assinatura ativa do usuário (gold > silver > bronze),
-- considerando qualquer artista. security definer para contornar o RLS de profiles/subscriptions.

drop function if exists public.get_post_comments(uuid);

create or replace function public.get_post_comments(p_post_id uuid)
returns table (
  id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  author_name text,
  author_avatar text,
  badge_tier text
)
language sql
security definer
set search_path = public
as $$
  select
    pc.id,
    pc.user_id,
    pc.content,
    pc.created_at,
    coalesce(pr.display_name, 'Fã') as author_name,
    pr.avatar_url as author_avatar,
    (
      select s.tier
      from subscriptions sub
      join plans s on s.id = sub.plan_id
      where sub.user_id = pc.user_id
        and sub.status = 'active'
      order by case s.tier
        when 'platinum' then 4
        when 'gold' then 3
        when 'silver' then 2
        when 'bronze' then 1
        else 0 end desc
      limit 1
    ) as badge_tier
  from post_comments pc
  left join profiles pr on pr.id = pc.user_id
  where pc.post_id = p_post_id
  order by pc.created_at asc;
$$;

grant execute on function public.get_post_comments(uuid) to anon, authenticated;

-- Retorna o melhor selo de assinante de um usuário (para o perfil e o cabeçalho).
create or replace function public.get_user_badge(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select s.tier
  from subscriptions sub
  join plans s on s.id = sub.plan_id
  where sub.user_id = p_user_id
    and sub.status = 'active'
  order by case s.tier
    when 'platinum' then 4
    when 'gold' then 3
    when 'silver' then 2
    when 'bronze' then 1
    else 0 end desc
  limit 1;
$$;

grant execute on function public.get_user_badge(uuid) to anon, authenticated;
