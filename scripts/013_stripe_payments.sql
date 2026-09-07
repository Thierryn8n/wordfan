-- 013_stripe_payments.sql
-- Adiciona colunas necessárias para pagamentos reais via Stripe (assinaturas recorrentes).
-- Idempotente: pode ser reexecutado com segurança.

-- Cliente Stripe por usuário (reaproveitado entre assinaturas e para o billing portal).
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Assinaturas: vínculo com a assinatura recorrente do Stripe + ciclo de cobrança.
alter table public.subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Uma linha por assinatura do Stripe.
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Transações: cada fatura paga vira uma transação, com split plataforma/artista.
alter table public.transactions
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists status text not null default 'paid',
  add column if not exists currency text not null default 'brl';

-- Evita registrar a mesma fatura duas vezes (idempotência do webhook).
create unique index if not exists transactions_stripe_invoice_id_key
  on public.transactions (stripe_invoice_id)
  where stripe_invoice_id is not null;
