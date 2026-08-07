-- Executar somente após aplicar 202608050001_platform_billing.sql.
-- Afeta exclusivamente a empresa cujo slug é studio-beautyflow.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- ANTES: deve retornar exatamente uma empresa. A assinatura pode ser nula.
select
  c.id as company_id,
  c.slug,
  bp.code as plan_code,
  cs.status as billing_status,
  cs.billing_exempt,
  cs.billing_enabled,
  cs.contracted_price_cents,
  cs.asaas_platform_customer_id,
  cs.asaas_subscription_id
from public.companies c
left join public.company_subscriptions cs on cs.company_id = c.id
left join public.billing_plans bp on bp.id = cs.billing_plan_id
where c.slug = 'studio-beautyflow';

do $$
declare
  v_company_id uuid;
  v_plan_id uuid;
  v_actor_user_id uuid;
  v_actor_email text;
  v_before_state jsonb;
  v_after_state jsonb;
  v_target_id text;
  v_company_count integer;
  v_plan_count integer;
  v_actor_count integer;
  v_already_exempt boolean;
begin
  select count(*)
    into v_company_count
  from public.companies
  where slug = 'studio-beautyflow';

  if v_company_count <> 1 then
    raise exception 'studio-beautyflow precisa identificar exatamente uma empresa; encontradas: %', v_company_count;
  end if;

  select id into strict v_company_id
  from public.companies
  where slug = 'studio-beautyflow';

  select count(*)
    into v_plan_count
  from public.billing_plans
  where code = 'advanced'
    and active = true;

  if v_plan_count <> 1 then
    raise exception 'plano advanced ativo precisa existir exatamente uma vez; encontrados: %', v_plan_count;
  end if;

  select id into strict v_plan_id
  from public.billing_plans
  where code = 'advanced'
    and active = true;

  select count(*)
    into v_actor_count
  from auth.users
  where lower(email) = 'silas.bulhoe@gmail.com';

  if v_actor_count <> 1 then
    raise exception 'administrador silas.bulhoe@gmail.com precisa existir exatamente uma vez; encontrados: %', v_actor_count;
  end if;

  select id, email
    into strict v_actor_user_id, v_actor_email
  from auth.users
  where lower(email) = 'silas.bulhoe@gmail.com';

  select
    to_jsonb(cs),
    (
      cs.billing_plan_id = v_plan_id
      and cs.status = 'exempt'
      and cs.billing_exempt = true
      and cs.billing_enabled = false
      and cs.contracted_price_cents = 0
    )
    into v_before_state, v_already_exempt
  from public.company_subscriptions cs
  where cs.company_id = v_company_id
  for update;

  if not found then
    v_before_state := null;
    v_already_exempt := false;
  end if;

  -- Idempotência: se já estiver exatamente no estado desejado, não altera
  -- updated_at e não cria outra auditoria.
  if v_already_exempt then
    return;
  end if;

  insert into public.company_subscriptions (
    company_id,
    billing_plan_id,
    status,
    billing_exempt,
    billing_enabled,
    contracted_price_cents
  ) values (
    v_company_id,
    v_plan_id,
    'exempt',
    true,
    false,
    0
  )
  on conflict (company_id) do update
  set
    billing_plan_id = excluded.billing_plan_id,
    status = 'exempt',
    billing_exempt = true,
    billing_enabled = false,
    contracted_price_cents = 0,
    updated_at = now()
  returning
    to_jsonb(company_subscriptions),
    company_subscriptions.id::text
  into v_after_state, v_target_id;

  -- O upsert não escreve nos campos Asaas; valores existentes são preservados.
  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    company_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state
  ) values (
    v_actor_user_id,
    v_actor_email,
    v_company_id,
    'studio_billing_exemption_enabled',
    'company_subscription',
    v_target_id,
    v_before_state,
    v_after_state
  );
end
$$;

-- DEPOIS: retorna exatamente advanced/exempt/true/false/0.
select
  c.id as company_id,
  c.slug,
  bp.code as plan_code,
  cs.status as billing_status,
  cs.billing_exempt,
  cs.billing_enabled,
  cs.contracted_price_cents,
  cs.asaas_platform_customer_id,
  cs.asaas_subscription_id
from public.companies c
join public.company_subscriptions cs on cs.company_id = c.id
join public.billing_plans bp on bp.id = cs.billing_plan_id
where c.slug = 'studio-beautyflow';

commit;
