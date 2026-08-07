begin;
set local lock_timeout = '5s';

revoke all on function public.confirm_manual_appointment_refund(
  uuid, uuid, integer, text, text, uuid, text
) from service_role, public, anon, authenticated;

drop function if exists public.confirm_manual_appointment_refund(
  uuid, uuid, integer, text, text, uuid, text
);

revoke all on table public.appointment_refund_operations
  from service_role, anon, authenticated;

drop table if exists public.appointment_refund_operations;

commit;
