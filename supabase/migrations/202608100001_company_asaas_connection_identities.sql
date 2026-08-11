begin;

alter table public.company_asaas_connections
  add column if not exists expected_name text,
  add column if not exists expected_email text,
  add column if not exists expected_cpf_cnpj text;

alter table public.company_asaas_connections
  drop constraint if exists company_asaas_connections_expected_cpf_cnpj_check;

alter table public.company_asaas_connections
  add constraint company_asaas_connections_expected_cpf_cnpj_check
  check (
    expected_cpf_cnpj is null
    or expected_cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'
  );

update public.company_asaas_connections
set
  expected_name = coalesce(expected_name, 'SILAS RIBEIRO BULHOES DE SOUZA'),
  expected_email = coalesce(expected_email, '170114317@aluno.unb.br'),
  updated_at = now()
where company_id = '44f31615-e339-4f88-9f3c-e04cc3dcb8e5'
  and environment = 'sandbox'
  and (expected_name is null or expected_email is null);

comment on column public.company_asaas_connections.expected_name is
  'Nome adicional esperado para a identidade financeira neste ambiente.';
comment on column public.company_asaas_connections.expected_email is
  'E-mail financeiro esperado e validado separadamente por ambiente.';
comment on column public.company_asaas_connections.expected_cpf_cnpj is
  'CPF/CNPJ esperado, somente dígitos, usado como identidade forte quando previamente confiável.';

commit;
