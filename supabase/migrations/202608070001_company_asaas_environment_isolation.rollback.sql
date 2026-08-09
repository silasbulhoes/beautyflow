-- Rollback de seguranca: recusa remover isolamento quando ja houver dados de Producao.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $$
begin
  if exists (select 1 from public.company_asaas_connections where environment = 'production')
     or exists (select 1 from public.appointments where asaas_environment = 'production')
     or exists (select 1 from public.appointment_refund_operations where asaas_environment = 'production')
     or exists (select 1 from public.asaas_webhook_events where asaas_environment = 'production') then
    raise exception 'rollback_blocked_production_asaas_data_exists';
  end if;
end
$$;

drop index if exists public.asaas_webhook_events_environment_payment_idx;
alter table public.asaas_webhook_events drop constraint if exists asaas_webhook_events_environment_check;
alter table public.asaas_webhook_events drop column if exists asaas_environment;

drop index if exists public.payment_reconciliation_runs_environment_idx;
alter table public.payment_reconciliation_issues drop constraint if exists payment_reconciliation_issues_environment_check;
alter table public.payment_reconciliation_issues drop column if exists asaas_environment;
alter table public.payment_reconciliation_runs drop constraint if exists payment_reconciliation_runs_environment_check;
alter table public.payment_reconciliation_runs drop column if exists asaas_environment;

drop index if exists public.appointment_refund_operations_environment_idx;
alter table public.appointment_refund_operations drop constraint if exists appointment_refund_asaas_environment_consistent;
alter table public.appointment_refund_operations drop constraint if exists appointment_refund_asaas_environment_check;
alter table public.appointment_refund_operations drop column if exists asaas_environment;

drop index if exists public.appointments_asaas_checkout_environment_uidx;
drop index if exists public.appointments_asaas_payment_environment_uidx;
drop index if exists public.appointments_company_asaas_environment_idx;
alter table public.appointments drop constraint if exists appointments_asaas_identifier_environment_check;
alter table public.appointments drop constraint if exists appointments_asaas_environment_check;
alter table public.appointments drop column if exists asaas_environment;

drop table public.company_asaas_connections;
commit;
