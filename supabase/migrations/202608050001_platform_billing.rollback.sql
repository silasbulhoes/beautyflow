-- Execute somente após confirmar que nenhuma cobrança/assinatura depende destas tabelas.
begin;
set local lock_timeout = '5s';

drop table if exists public.payment_reconciliation_issues;
drop table if exists public.payment_reconciliation_runs;
-- Preservada porque pode ter sido criada manualmente antes da migration e
-- conter auditorias de outras funcionalidades.
drop table if exists public.platform_billing_events;
drop table if exists public.company_subscriptions;
drop table if exists public.billing_plans;

commit;
