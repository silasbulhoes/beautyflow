-- Isola credenciais e identificadores de pagamentos profissionais por ambiente.
-- Backward-safe: os campos Asaas legados de companies permanecem intactos.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create table public.company_asaas_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  environment text not null check (environment in ('sandbox', 'production')),
  api_key_encrypted text not null check (length(trim(api_key_encrypted)) > 0),
  account_id text,
  wallet_id text,
  account_status text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_asaas_connections_company_environment_key unique (company_id, environment)
);

create unique index company_asaas_connections_account_environment_uidx
  on public.company_asaas_connections (environment, account_id)
  where account_id is not null;
create unique index company_asaas_connections_wallet_environment_uidx
  on public.company_asaas_connections (environment, wallet_id)
  where wallet_id is not null;

alter table public.company_asaas_connections enable row level security;
revoke all on public.company_asaas_connections from public, anon, authenticated;
grant select, insert, update, delete on public.company_asaas_connections to service_role;

insert into public.company_asaas_connections (
  company_id, environment, api_key_encrypted, account_id, wallet_id,
  account_status, connected_at, created_at, updated_at
)
select
  c.id, 'sandbox', c.asaas_api_key_encrypted,
  nullif(trim(c.asaas_account_id), ''), nullif(trim(c.asaas_wallet_id), ''),
  c.asaas_account_status, coalesce(c.asaas_connected_at, c.updated_at, now()),
  coalesce(c.created_at, now()), coalesce(c.updated_at, now())
from public.companies c
where nullif(trim(c.asaas_api_key_encrypted), '') is not null
on conflict (company_id, environment) do nothing;

alter table public.appointments add column asaas_environment text;
update public.appointments
set asaas_environment = 'sandbox'
where asaas_environment is null
  and (
    nullif(trim(asaas_checkout_id), '') is not null
    or nullif(trim(asaas_payment_id), '') is not null
    or payment_provider = 'asaas'
  );
alter table public.appointments
  add constraint appointments_asaas_environment_check
  check (asaas_environment is null or asaas_environment in ('sandbox', 'production')) not valid,
  add constraint appointments_asaas_identifier_environment_check
  check (
    (nullif(trim(asaas_checkout_id), '') is null and nullif(trim(asaas_payment_id), '') is null)
    or asaas_environment is not null
  ) not valid;
alter table public.appointments validate constraint appointments_asaas_environment_check;
alter table public.appointments validate constraint appointments_asaas_identifier_environment_check;
create index appointments_company_asaas_environment_idx
  on public.appointments (company_id, asaas_environment);
create unique index appointments_asaas_payment_environment_uidx
  on public.appointments (asaas_environment, asaas_payment_id)
  where asaas_payment_id is not null;
create unique index appointments_asaas_checkout_environment_uidx
  on public.appointments (asaas_environment, asaas_checkout_id)
  where asaas_checkout_id is not null;

alter table public.appointment_refund_operations add column asaas_environment text;
update public.appointment_refund_operations r
set asaas_environment = coalesce(a.asaas_environment, 'sandbox')
from public.appointments a
where a.id = r.appointment_id
  and r.provider = 'asaas'
  and r.asaas_environment is null;
alter table public.appointment_refund_operations
  add constraint appointment_refund_asaas_environment_check
  check (asaas_environment is null or asaas_environment in ('sandbox', 'production')) not valid,
  add constraint appointment_refund_asaas_environment_consistent
  check (
    (provider = 'asaas' and asaas_environment is not null)
    or (provider is null and asaas_environment is null)
  ) not valid;
alter table public.appointment_refund_operations validate constraint appointment_refund_asaas_environment_check;
alter table public.appointment_refund_operations validate constraint appointment_refund_asaas_environment_consistent;
create index appointment_refund_operations_environment_idx
  on public.appointment_refund_operations (company_id, asaas_environment, status);

alter table public.payment_reconciliation_runs add column asaas_environment text;
update public.payment_reconciliation_runs set asaas_environment = 'sandbox' where asaas_environment is null;
alter table public.payment_reconciliation_runs alter column asaas_environment set not null;
alter table public.payment_reconciliation_runs add constraint payment_reconciliation_runs_environment_check
  check (asaas_environment in ('sandbox', 'production'));

alter table public.payment_reconciliation_issues add column asaas_environment text;
update public.payment_reconciliation_issues i
set asaas_environment = r.asaas_environment
from public.payment_reconciliation_runs r
where r.id = i.run_id and i.asaas_environment is null;
alter table public.payment_reconciliation_issues alter column asaas_environment set not null;
alter table public.payment_reconciliation_issues add constraint payment_reconciliation_issues_environment_check
  check (asaas_environment in ('sandbox', 'production'));
create index payment_reconciliation_runs_environment_idx
  on public.payment_reconciliation_runs (asaas_environment, started_at desc);

-- A tabela e a RPC de webhook pertencem ao schema-base do projeto.
alter table public.asaas_webhook_events add column asaas_environment text;
update public.asaas_webhook_events set asaas_environment = 'sandbox' where asaas_environment is null;
alter table public.asaas_webhook_events add constraint asaas_webhook_events_environment_check
  check (asaas_environment is null or asaas_environment in ('sandbox', 'production'));
create index asaas_webhook_events_environment_payment_idx
  on public.asaas_webhook_events (asaas_environment, payment_id);

comment on table public.company_asaas_connections is
  'Credenciais profissionais Asaas isoladas por empresa e ambiente; nao representa a conta-pai de mensalidades.';
comment on column public.appointments.asaas_environment is
  'Ambiente imutavel dos identificadores Asaas profissionais deste agendamento.';

commit;
