-- Guarda o status de visualização do onboarding na tabela do usuário.
-- Rode este script no SQL Editor do Supabase.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

-- Permite que cada usuário atualize o próprio perfil (necessário para gravar o status).
-- Só cria a policy se ainda não existir uma de UPDATE para o próprio registro.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'UPDATE'
  ) then
    create policy profiles_update_own on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
