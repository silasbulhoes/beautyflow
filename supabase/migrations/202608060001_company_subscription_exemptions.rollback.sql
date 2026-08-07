begin;
set local lock_timeout = '5s';

revoke all on function public.grant_company_billing_exemption(uuid, text, text, date, uuid, text)
  from service_role, public, anon, authenticated;
revoke all on function public.revoke_company_billing_exemption(uuid, text, uuid, text)
  from service_role, public, anon, authenticated;

drop function if exists public.grant_company_billing_exemption(uuid, text, text, date, uuid, text);
drop function if exists public.revoke_company_billing_exemption(uuid, text, uuid, text);

drop index if exists public.company_subscriptions_exemption_ends_idx;

alter table public.company_subscriptions
  drop constraint if exists company_subscription_exemption_metadata_consistent,
  drop column if exists exemption_reason,
  drop column if exists exemption_ends_at,
  drop column if exists exemption_granted_by,
  drop column if exists exemption_granted_at;

commit;
