# Identidade financeira Asaas por ambiente

## Estado auditado

`companies` não possui CPF/CNPJ, razão social ou e-mail financeiro. Para o Studio BeautyFlow, a tabela contém apenas o nome de exibição `Studio BeautyFlow` e o e-mail administrativo `silas.bulhoe@gmail.com`; esses campos não são usados para validar a titularidade Asaas.

Antes desta alteração, a Server Action de reconexão continha nome e e-mail Sandbox fixos no código e os exigia também em Production.

## Migration incremental

Aplicar, antes de publicar o código, `202608100001_company_asaas_connection_identities.sql`. Ela adiciona a `company_asaas_connections`:

- `expected_name`: conferência adicional por ambiente;
- `expected_email`: e-mail financeiro esperado por ambiente;
- `expected_cpf_cnpj`: identidade forte, somente quando houver origem previamente confiável.

A migration preenche apenas a identidade da conexão Sandbox já existente do Studio. Não cria conexão Production, não altera chaves e não toca em agendamentos ou pagamentos.

## Verificação antes

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'company_asaas_connections'
  and column_name in ('expected_name', 'expected_email', 'expected_cpf_cnpj');
```

Resultado esperado antes: nenhuma linha.

## Verificação depois

```sql
select environment,
       expected_name,
       expected_email,
       case when expected_cpf_cnpj is null then null else right(expected_cpf_cnpj, 4) end as document_suffix
from public.company_asaas_connections
where company_id = '44f31615-e339-4f88-9f3c-e04cc3dcb8e5'
order by environment;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.company_asaas_connections'::regclass
  and conname = 'company_asaas_connections_expected_cpf_cnpj_check';
```

O Sandbox deve manter sua identidade atual. Production deve continuar ausente até o provisionamento administrativo aprovado.

## Rollback

O rollback está em `202608100001_company_asaas_connection_identities.rollback.sql`. Ele aborta se já houver identidade Production, evitando apagar uma identidade real depois do cutover.

## Fluxo do primeiro cadastro Production

Sem CPF/CNPJ confiável no BeautyFlow, o administrador informa o e-mail financeiro esperado de Production. A Server Action exige admin e MFA, consulta a credencial por GET na API Production, compara o e-mail retornado, exibe prévia mascarada e gera token temporário criptografado. Na confirmação, consulta novamente o Asaas e só então grava identidade e conexão específicas de Production, com auditoria. A identidade Sandbox não é lida nem sobrescrita.
