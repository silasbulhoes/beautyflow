-- BeautyFlow platform billing foundation.
-- Incremental migration: does not modify appointment or customer payment data.

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free', 'intermediate', 'advanced')),
  name text not null,
  description text not null default '',
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  billing_period text not null default 'monthly' check (billing_period = 'monthly'),
  grace_period_days integer not null default 7 check (grace_period_days between 0 and 90),
  features jsonb not null default '[]'::jsonb,
  recommended boolean not null default false,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete restrict,
  billing_plan_id uuid not null references public.billing_plans(id) on delete restrict,
  status text not null default 'pending' check (status in ('trial', 'active', 'overdue', 'canceled', 'exempt', 'pending')),
  billing_exempt boolean not null default false,
  billing_enabled boolean not null default false,
  contracted_price_cents integer not null check (contracted_price_cents >= 0),
  asaas_platform_customer_id text,
  asaas_subscription_id text,
  asaas_environment text check (asaas_environment in ('sandbox', 'production')),
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_due_date date,
  overdue_since timestamptz,
  canceled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_subscription_exemption_consistent check (
    (billing_exempt and status = 'exempt' and not billing_enabled)
    or not billing_exempt
  )
);

create unique index if not exists company_subscriptions_platform_customer_uidx
  on public.company_subscriptions (asaas_platform_customer_id)
  where asaas_platform_customer_id is not null;
create unique index if not exists company_subscriptions_asaas_subscription_uidx
  on public.company_subscriptions (asaas_subscription_id)
  where asaas_subscription_id is not null;
create index if not exists company_subscriptions_status_idx
  on public.company_subscriptions (status, next_due_date);

create table if not exists public.platform_billing_events (
  id uuid primary key default gen_random_uuid(),
  asaas_event_id text not null unique,
  event_type text not null,
  company_id uuid references public.companies(id) on delete set null,
  subscription_id uuid references public.company_subscriptions(id) on delete set null,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_payment_id text,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'ignored', 'unmatched', 'failed')),
  payload_sha256 text not null,
  payload_summary jsonb not null default '{}'::jsonb,
  delivery_count integer not null default 1 check (delivery_count > 0),
  last_error text,
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_email text not null,
  company_id uuid references public.companies(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_company_created_idx
  on public.admin_audit_logs (company_id, created_at desc);

create table if not exists public.payment_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  trigger_source text not null check (trigger_source in ('admin', 'cron')),
  checked_count integer not null default 0,
  confirmed_count integer not null default 0,
  expired_count integer not null default 0,
  inconsistent_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  requested_by uuid references auth.users(id) on delete set null
);

create table if not exists public.payment_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payment_reconciliation_runs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  issue_code text not null,
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.billing_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.platform_billing_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.payment_reconciliation_runs enable row level security;
alter table public.payment_reconciliation_issues enable row level security;

drop policy if exists "active billing plans are publicly readable" on public.billing_plans;
create policy "active billing plans are publicly readable" on public.billing_plans
  for select to anon, authenticated using (active = true);

drop policy if exists "company members read own subscription" on public.company_subscriptions;
create policy "company members read own subscription" on public.company_subscriptions
  for select to authenticated using (
    company_id = (select p.company_id from public.profiles p where p.id = auth.uid() and p.active = true)
  );

revoke all on public.company_subscriptions from anon, authenticated;
grant select on public.company_subscriptions to authenticated;
revoke all on public.platform_billing_events, public.admin_audit_logs,
  public.payment_reconciliation_runs, public.payment_reconciliation_issues from anon, authenticated;

insert into public.billing_plans
  (code, name, description, monthly_price_cents, features, recommended, display_order)
values
  ('free', 'Grátis', 'Plano inicial do BeautyFlow.', 0, '[]'::jsonb, false, 1),
  ('intermediate', 'Intermediário', 'Agenda e pagamentos para profissionais em crescimento.', 0, '[]'::jsonb, true, 2),
  ('advanced', 'Avançado', 'Recursos administrativos e automações.', 0, '[]'::jsonb, false, 3)
on conflict (code) do nothing;

comment on table public.company_subscriptions is
  'Mensalidade SaaS cobrada pela conta-pai; nunca representa sinais de agendamentos.';
comment on column public.company_subscriptions.billing_enabled is
  'Deve permanecer false até ativação administrativa explícita da cobrança recorrente.';
