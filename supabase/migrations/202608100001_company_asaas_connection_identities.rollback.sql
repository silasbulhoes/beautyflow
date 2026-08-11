begin;

do $$
begin
  if exists (
    select 1 from public.company_asaas_connections
    where environment = 'production'
      and (expected_name is not null or expected_email is not null or expected_cpf_cnpj is not null)
  ) then
    raise exception 'Rollback bloqueado: há identidade Production cadastrada.';
  end if;
end $$;

alter table public.company_asaas_connections
  drop constraint if exists company_asaas_connections_expected_cpf_cnpj_check,
  drop column if exists expected_name,
  drop column if exists expected_email,
  drop column if exists expected_cpf_cnpj;

commit;
