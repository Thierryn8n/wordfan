-- Políticas de RLS que habilitam o CRUD do painel administrativo.
-- Sem elas o admin só enxerga/edita os próprios registros, pois as políticas
-- existentes são todas escopadas em auth.uid().
-- A função is_admin() já existe no banco e é usada pelas políticas atuais.

-- ============ PROFILES ============
-- Admin precisa editar papel/XP e remover perfis de qualquer usuário.
drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- ============ NOTIFICATIONS ============
-- Envio em massa: o admin grava linhas cujo user_id é de outra pessoa.
drop policy if exists notif_admin_select on public.notifications;
create policy notif_admin_select on public.notifications
  for select using (public.is_admin());

drop policy if exists notif_admin_insert on public.notifications;
create policy notif_admin_insert on public.notifications
  for insert with check (public.is_admin());

drop policy if exists notif_admin_update on public.notifications;
create policy notif_admin_update on public.notifications
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_admin_delete on public.notifications;
create policy notif_admin_delete on public.notifications
  for delete using (public.is_admin());

-- O fã precisa poder apagar as próprias notificações.
drop policy if exists notif_delete_own on public.notifications;
create policy notif_delete_own on public.notifications
  for delete using (user_id = auth.uid());

-- ============ SUBSCRIPTIONS ============
drop policy if exists subs_admin_insert on public.subscriptions;
create policy subs_admin_insert on public.subscriptions
  for insert with check (public.is_admin());

drop policy if exists subs_admin_update on public.subscriptions;
create policy subs_admin_update on public.subscriptions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists subs_admin_delete on public.subscriptions;
create policy subs_admin_delete on public.subscriptions
  for delete using (public.is_admin());

-- ============ TRANSACTIONS ============
drop policy if exists tx_admin_insert on public.transactions;
create policy tx_admin_insert on public.transactions
  for insert with check (public.is_admin());

drop policy if exists tx_admin_update on public.transactions;
create policy tx_admin_update on public.transactions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists tx_admin_delete on public.transactions;
create policy tx_admin_delete on public.transactions
  for delete using (public.is_admin());

-- ============ LIMPEZA ============
-- Remove a conta temporária usada apenas para validar o painel no navegador.
delete from auth.users where email = 'qa.admin.temp@example.com';
