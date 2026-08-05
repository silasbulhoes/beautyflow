-- Execute somente após confirmar que nenhuma cobrança/assinatura depende destas tabelas.
drop table if exists public.payment_reconciliation_issues;
drop table if exists public.payment_reconciliation_runs;
drop table if exists public.admin_audit_logs;
drop table if exists public.platform_billing_events;
drop table if exists public.company_subscriptions;
drop table if exists public.billing_plans;
