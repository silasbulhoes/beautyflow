# Isolamento Asaas profissional por ambiente

## Estado e ordem de ativacao

Esta alteracao nao foi aplicada. A ordem obrigatoria e:

1. Confirmar backup e executar as consultas de pre-verificacao abaixo.
2. Aplicar `supabase/migrations/202608070001_company_asaas_environment_isolation.sql` no Supabase compartilhado.
3. Confirmar o backfill e as constraints com as consultas de pos-verificacao.
4. Configurar `ASAAS_ENVIRONMENT=sandbox` e `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` em Preview.
5. Configurar `ASAAS_ENVIRONMENT=production` e `ASAAS_API_URL=https://api.asaas.com/v3` em Production.
6. Manter `BILLING_ENFORCEMENT_ENABLED=false` e nao alterar `ASAAS_PLATFORM_*`.
7. Publicar o codigo somente depois do schema, pois ele nao usa fallback para a chave legada.
8. Reconectar a conta profissional de Producao pela tela administrativa no deployment Production, com MFA e aprovacao explicita.

## Pre-verificacao (somente leitura)

```sql
select c.id, c.slug,
       (nullif(trim(c.asaas_api_key_encrypted), '') is not null) as has_legacy_key,
       c.asaas_account_id, c.asaas_wallet_id, c.asaas_account_status
from public.companies c
order by c.slug;

select count(*) as asaas_appointments_to_backfill
from public.appointments
where nullif(trim(asaas_checkout_id), '') is not null
   or nullif(trim(asaas_payment_id), '') is not null
   or payment_provider = 'asaas';

select asaas_account_id, count(*)
from public.companies
where nullif(trim(asaas_account_id), '') is not null
group by asaas_account_id having count(*) > 1;

select asaas_wallet_id, count(*)
from public.companies
where nullif(trim(asaas_wallet_id), '') is not null
group by asaas_wallet_id having count(*) > 1;
```

Qualquer duplicidade de account ou wallet deve ser investigada antes da migration; os indices unicos fazem a transacao abortar em vez de aceitar uma associacao ambigua.

## Pos-verificacao (somente leitura)

```sql
select company_id, environment, account_id, wallet_id, account_status,
       connected_at, created_at, updated_at,
       (api_key_encrypted is not null) as has_encrypted_key
from public.company_asaas_connections
order by company_id, environment;

select c.id, c.slug
from public.companies c
where nullif(trim(c.asaas_api_key_encrypted), '') is not null
  and not exists (
    select 1 from public.company_asaas_connections x
    where x.company_id = c.id and x.environment = 'sandbox'
  );

select id, company_id, asaas_checkout_id, asaas_payment_id, asaas_environment
from public.appointments
where (asaas_checkout_id is not null or asaas_payment_id is not null)
  and asaas_environment is distinct from 'sandbox';

select r.id, r.appointment_id, r.provider, r.asaas_environment,
       a.asaas_environment as appointment_environment
from public.appointment_refund_operations r
join public.appointments a on a.id = r.appointment_id
where r.provider = 'asaas'
  and r.asaas_environment is distinct from a.asaas_environment;

select asaas_environment, count(*) from public.asaas_webhook_events group by 1;
select asaas_environment, count(*) from public.payment_reconciliation_runs group by 1;
select asaas_environment, count(*) from public.payment_reconciliation_issues group by 1;
```

Resultado esperado: todas as conexoes legadas e todos os recursos profissionais historicos existentes ficam marcados como `sandbox`; nenhuma linha de Producao e criada pela migration.

## Impacto e locks

- Cria uma tabela pequena e indices novos.
- `ALTER TABLE ... ADD COLUMN` exige lock curto nas tabelas afetadas.
- Os `UPDATE` de backfill escrevem nas linhas historicas e podem gerar WAL proporcional ao volume.
- A validacao das constraints le as tabelas e pode aguardar transacoes concorrentes.
- `lock_timeout=5s` aborta toda a transacao se um lock seguro nao puder ser obtido; nada fica parcialmente aplicado.
- Os campos legados de `companies` nao sao apagados nem alterados.
- Clientes, servicos, horarios, valores, status de agendamento, IDs Asaas e credenciais `ASAAS_PLATFORM_*` nao sao alterados.

## Regra de runtime

`ASAAS_ENVIRONMENT` e obrigatoria. A URL tambem e validada: Sandbox aceita apenas `api-sandbox.asaas.com`; Producao aceita apenas `api.asaas.com`. A conexao e buscada por empresa e pelo mesmo ambiente. Agendamento, refund, reconciliacao e webhook sao filtrados pelo ambiente antes da chamada externa.

O endpoint de webhook nao recebe um campo de ambiente confiavel do Asaas. Portanto o deployment que recebeu a requisicao fornece o ambiente explicito, o token deve ser diferente por escopo Vercel, e o evento e registrado com um identificador idempotente prefixado pelo ambiente.

## Rollback

O SQL completo esta em `supabase/migrations/202608070001_company_asaas_environment_isolation.rollback.sql`. Ele aborta se encontrar qualquer conexao, agendamento, refund ou webhook de Producao, evitando apagar dados reais. Antes do primeiro dado de Producao, ele remove apenas colunas, indices, constraints e a tabela introduzidos por esta migration; os campos legados permanecem disponiveis.

## Plano de backfill

O backfill e transacional e deterministico: copia somente chaves profissionais legadas nao vazias para Sandbox; marca como Sandbox os agendamentos que ja possuem ID de checkout, ID de payment ou provider Asaas; herda o ambiente do agendamento nos refunds; marca os eventos e reconciliacoes preexistentes como Sandbox. Agendamentos sem interacao Asaas permanecem com `asaas_environment = null`.
