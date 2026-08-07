-- Gerenciamento geral de isenções de mensalidade.
-- Depende de 202608050001_platform_billing.sql.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.company_subscriptions
  add column if not exists exemption_reason text,
  add column if not exists exemption_ends_at date,
  add column if not exists exemption_granted_by uuid references auth.users(id) on delete set null,
  add column if not exists exemption_granted_at timestamptz;

-- Compatibilidade com isenções criadas antes destes campos.
update public.company_subscriptions
set
  exemption_reason = coalesce(nullif(trim(exemption_reason), ''), 'Isenção existente antes da migration de vigência'),
  exemption_granted_at = coalesce(exemption_granted_at, updated_at, created_at, now())
where billing_exempt = true
  and (
    exemption_reason is null
    or trim(exemption_reason) = ''
    or exemption_granted_at is null
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.company_subscriptions'::regclass
      and conname = 'company_subscription_exemption_metadata_consistent'
  ) then
    alter table public.company_subscriptions
      add constraint company_subscription_exemption_metadata_consistent
      check (
        (
          billing_exempt = true
          and status = 'exempt'
          and billing_enabled = false
          and exemption_reason is not null
          and trim(exemption_reason) <> ''
          and exemption_granted_at is not null
        )
        or
        (
          billing_exempt = false
          and exemption_reason is null
          and exemption_ends_at is null
          and exemption_granted_by is null
          and exemption_granted_at is null
        )
      );
  end if;
end
$$;

create index if not exists company_subscriptions_exemption_ends_idx
  on public.company_subscriptions (exemption_ends_at)
  where billing_exempt = true and exemption_ends_at is not null;

create or replace function public.grant_company_billing_exemption(
  p_company_id uuid,
  p_plan_code text,
  p_reason text,
  p_ends_at date,
  p_actor_user_id uuid,
  p_actor_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_plan_count integer;
  v_subscription public.company_subscriptions%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_subscription_id uuid;
begin
  perform 1 from public.companies where id = p_company_id;
  if not found then raise exception 'company_not_found'; end if;

  perform 1 from auth.users where id = p_actor_user_id;
  if not found then raise exception 'actor_not_found'; end if;

  select count(*) into v_plan_count
  from public.billing_plans
  where code = p_plan_code and active = true;
  if v_plan_count <> 1 then raise exception 'active_plan_not_found_or_duplicated'; end if;

  select id into strict v_plan_id
  from public.billing_plans
  where code = p_plan_code and active = true;

  if p_plan_code not in ('free', 'intermediate', 'advanced') then
    raise exception 'invalid_plan_code';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 or length(trim(p_reason)) > 500 then
    raise exception 'invalid_exemption_reason';
  end if;
  if p_ends_at is not null and p_ends_at < current_date then
    raise exception 'invalid_exemption_end_date';
  end if;

  select * into v_subscription
  from public.company_subscriptions
  where company_id = p_company_id
  for update;

  if found then
    v_before := to_jsonb(v_subscription);
    if v_subscription.billing_plan_id = v_plan_id
       and v_subscription.status = 'exempt'
       and v_subscription.billing_exempt = true
       and v_subscription.billing_enabled = false
       and v_subscription.contracted_price_cents = 0
       and v_subscription.exemption_reason = trim(p_reason)
       and v_subscription.exemption_ends_at is not distinct from p_ends_at then
      return v_subscription.id;
    end if;
  else
    v_before := null;
  end if;

  insert into public.company_subscriptions as cs (
    company_id, billing_plan_id, status, billing_exempt, billing_enabled,
    contracted_price_cents, exemption_reason, exemption_ends_at,
    exemption_granted_by, exemption_granted_at
  ) values (
    p_company_id, v_plan_id, 'exempt', true, false,
    0, trim(p_reason), p_ends_at, p_actor_user_id, now()
  )
  on conflict (company_id) do update
  set
    billing_plan_id = excluded.billing_plan_id,
    status = 'exempt',
    billing_exempt = true,
    billing_enabled = false,
    contracted_price_cents = 0,
    exemption_reason = excluded.exemption_reason,
    exemption_ends_at = excluded.exemption_ends_at,
    exemption_granted_by = excluded.exemption_granted_by,
    exemption_granted_at = excluded.exemption_granted_at,
    updated_at = now()
  returning cs.id, to_jsonb(cs)
  into v_subscription_id, v_after;

  insert into public.admin_audit_logs (
    actor_user_id, actor_email, company_id, action, target_type,
    target_id, before_state, after_state
  ) values (
    p_actor_user_id, p_actor_email, p_company_id,
    'grant_billing_exemption', 'company_subscription',
    v_subscription_id::text,
    v_before,
    v_after || jsonb_build_object('reason', trim(p_reason), 'exemption_ends_at', p_ends_at)
  );

  return v_subscription_id;
end;
$$;

create or replace function public.revoke_company_billing_exemption(
  p_company_id uuid,
  p_reason text,
  p_actor_user_id uuid,
  p_actor_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.company_subscriptions%rowtype;
  v_before jsonb;
  v_after jsonb;
begin
  perform 1 from public.companies where id = p_company_id;
  if not found then raise exception 'company_not_found'; end if;

  perform 1 from auth.users where id = p_actor_user_id;
  if not found then raise exception 'actor_not_found'; end if;

  if p_reason is null or length(trim(p_reason)) < 5 or length(trim(p_reason)) > 500 then
    raise exception 'invalid_revoke_reason';
  end if;

  select * into v_subscription
  from public.company_subscriptions
  where company_id = p_company_id
  for update;

  if not found then raise exception 'subscription_not_found'; end if;

  if v_subscription.billing_exempt = false
     and v_subscription.billing_enabled = false
     and v_subscription.status = 'pending' then
    return v_subscription.id;
  end if;

  v_before := to_jsonb(v_subscription);

  update public.company_subscriptions as cs
  set
    status = 'pending',
    billing_exempt = false,
    billing_enabled = false,
    exemption_reason = null,
    exemption_ends_at = null,
    exemption_granted_by = null,
    exemption_granted_at = null,
    updated_at = now()
  where id = v_subscription.id
    and company_id = p_company_id
  returning to_jsonb(cs) into v_after;

  insert into public.admin_audit_logs (
    actor_user_id, actor_email, company_id, action, target_type,
    target_id, before_state, after_state
  ) values (
    p_actor_user_id, p_actor_email, p_company_id,
    'revoke_billing_exemption', 'company_subscription',
    v_subscription.id::text,
    v_before,
    v_after || jsonb_build_object('reason', trim(p_reason))
  );

  return v_subscription.id;
end;
$$;

revoke all on function public.grant_company_billing_exemption(uuid, text, text, date, uuid, text)
  from public, anon, authenticated;
revoke all on function public.revoke_company_billing_exemption(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.grant_company_billing_exemption(uuid, text, text, date, uuid, text)
  to service_role;
grant execute on function public.revoke_company_billing_exemption(uuid, text, uuid, text)
  to service_role;

commit;
