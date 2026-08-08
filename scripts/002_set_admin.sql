-- Promove o usuário thierry.designer.oficial@gmail.com a administrador.
-- Requisito: o usuário já precisa ter criado a conta (existir em auth.users).
-- Rode este script no SQL Editor do Supabase.

update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('thierry.designer.oficial@gmail.com');

-- Verificação (opcional): deve retornar o perfil com role = 'admin'
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('thierry.designer.oficial@gmail.com');
