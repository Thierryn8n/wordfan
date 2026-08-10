-- Corrige contratações Enterprise que já foram pagas mas ficaram presas
-- em "lista de espera" (fluxo antigo exigia aprovação manual do admin).
-- Agora, pagou = Enterprise ativo. Promove todos os leads pagos e ainda
-- não recusados para `approved`, ativando o selo holográfico no perfil.
update public.enterprise_leads
set
  status = 'approved',
  reviewed_at = coalesce(reviewed_at, now()),
  review_note = coalesce(review_note, 'Ativado automaticamente (backfill pós-pagamento).')
where paid = true
  and status in ('waitlist', 'pending_payment');

-- Notifica in-app quem acabou de ser ativado por este backfill.
insert into public.notifications (user_id, title, body)
select l.user_id, 'Enterprise ativado', 'Pagamento confirmado! Seu selo Enterprise já está ativo no seu perfil.'
from public.enterprise_leads l
where l.paid = true
  and l.status = 'approved'
  and l.review_note = 'Ativado automaticamente (backfill pós-pagamento).';
