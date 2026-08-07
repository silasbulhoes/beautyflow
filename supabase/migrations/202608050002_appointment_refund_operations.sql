-- Histórico separado de estornos Asaas e reembolsos manuais.
-- Não altera a constraint de appointments.payment_status.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.appointment_refund_operations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  operation_type text not null check (operation_type in ('automatic', 'manual')),
  status text not null check (status in (
    'requested',
    'awaiting_authorization',
    'processing',
    'cancelled',
    'completed'
  )),
  amount_cents integer not null check (amount_cents > 0),
  provider text check (provider is null or provider = 'asaas'),
  asaas_payment_id text,
  asaas_refund_reference text,
  idempotency_key text not null unique,
  observation text,
  receipt_url text,
  provider_payload_summary jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_refund_provider_consistent check (
    (operation_type = 'automatic' and provider = 'asaas' and asaas_payment_id is not null)
    or
    (operation_type = 'manual' and provider is null)
  ),
  constraint appointment_refund_completion_consistent check (
    (status = 'completed' and completed_at is not null and completed_by is not null)
    or
    (status <> 'completed' and completed_at is null)
  )
);

create index if not exists appointment_refund_operations_appointment_idx
  on public.appointment_refund_operations (appointment_id, created_at desc);

create index if not exists appointment_refund_operations_company_status_idx
  on public.appointment_refund_operations (company_id, status, created_at desc);

alter table public.appointment_refund_operations enable row level security;

revoke all on public.appointment_refund_operations from anon, authenticated;
grant select, insert, update on public.appointment_refund_operations to service_role;

create or replace function public.confirm_manual_appointment_refund(
  p_appointment_id uuid,
  p_company_id uuid,
  p_amount_cents integer,
  p_observation text,
  p_receipt_url text,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation_id uuid;
  v_appointment public.appointments%rowtype;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'appointment_not_found';
  end if;

  if v_appointment.status <> 'confirmed'
     or v_appointment.payment_status <> 'received' then
    raise exception 'appointment_not_eligible_for_manual_refund';
  end if;

  if p_amount_cents <= 0
     or p_amount_cents > v_appointment.deposit_amount_cents then
    raise exception 'invalid_manual_refund_amount';
  end if;

  insert into public.appointment_refund_operations (
    appointment_id,
    company_id,
    operation_type,
    status,
    amount_cents,
    provider,
    idempotency_key,
    observation,
    receipt_url,
    requested_by,
    completed_by,
    completed_at
  ) values (
    p_appointment_id,
    p_company_id,
    'manual',
    'completed',
    p_amount_cents,
    null,
    p_idempotency_key,
    nullif(trim(p_observation), ''),
    nullif(trim(p_receipt_url), ''),
    p_actor_user_id,
    p_actor_user_id,
    now()
  )
  on conflict (idempotency_key) do nothing
  returning id into v_operation_id;

  if v_operation_id is null then
    raise exception 'manual_refund_already_registered';
  end if;

  update public.appointments
  set status = 'cancelled'
  where id = p_appointment_id
    and company_id = p_company_id
    and status = 'confirmed'
    and payment_status = 'received';

  if not found then
    raise exception 'appointment_changed_during_manual_refund';
  end if;

  return v_operation_id;
end;
$$;

revoke all on function public.confirm_manual_appointment_refund(
  uuid, uuid, integer, text, text, uuid, text
) from public, anon, authenticated;

grant execute on function public.confirm_manual_appointment_refund(
  uuid, uuid, integer, text, text, uuid, text
) to service_role;

commit;
