-- Reverte usando o before_state da auditoria criada pelo SQL de isenção.
-- Não remove nem altera IDs Asaas que não tenham sido modificados pelo script.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_company_id uuid;
  v_company_count integer;
  v_audit_count integer;
  v_before_state jsonb;
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
    into v_audit_count
  from public.admin_audit_logs
  where company_id = v_company_id
    and action = 'studio_billing_exemption_enabled';

  if v_audit_count = 0 then
    raise exception 'auditoria da isenção não encontrada; rollback não executado';
  end if;

  select before_state
    into v_before_state
  from public.admin_audit_logs
  where company_id = v_company_id
    and action = 'studio_billing_exemption_enabled'
  order by created_at desc, id desc
  limit 1;

  if v_before_state is null then
    delete from public.company_subscriptions
    where company_id = v_company_id
      and status = 'exempt'
      and billing_exempt = true
      and billing_enabled = false
      and contracted_price_cents = 0;

    if not found then
      raise exception 'assinatura atual divergiu; rollback não executado';
    end if;
  else
    update public.company_subscriptions
    set
      billing_plan_id = (v_before_state->>'billing_plan_id')::uuid,
      status = v_before_state->>'status',
      billing_exempt = (v_before_state->>'billing_exempt')::boolean,
      billing_enabled = (v_before_state->>'billing_enabled')::boolean,
      contracted_price_cents = (v_before_state->>'contracted_price_cents')::integer,
      next_due_date = (v_before_state->>'next_due_date')::date,
      updated_at = now()
    where company_id = v_company_id
      and status = 'exempt'
      and billing_exempt = true
      and billing_enabled = false
      and contracted_price_cents = 0;

    if not found then
      raise exception 'assinatura atual divergiu; rollback não executado';
    end if;
  end if;
end
$$;

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

commit;
