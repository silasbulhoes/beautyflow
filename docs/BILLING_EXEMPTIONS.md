# Isenções de mensalidade

## Aplicação

Aplicada com sucesso no Supabase em 06/08/2026, depois de `202608050001_platform_billing.sql` e `202608050002_appointment_refund_operations.sql`.

Uma verificação somente leitura pelo OpenAPI/PostgREST real confirmou os quatro campos, as RPCs `grant_company_billing_exemption` e `revoke_company_billing_exemption`, e o Studio BeautyFlow no plano `advanced`, com `status = exempt`, `billing_exempt = true` e `billing_enabled = false`. O OpenAPI não expõe `pg_constraint` ou `pg_indexes`; a constraint e o índice fazem parte da mesma transação aplicada e são criados antes das RPCs confirmadas.

Ela adiciona metadados de concessão, normaliza isenções legadas e cria duas funções transacionais acessíveis exclusivamente pela `service_role`. Concessão e remoção preservam `asaas_platform_customer_id` e `asaas_subscription_id`; nenhuma chamada ao Asaas é feita.

## Impacto e locks

- `ALTER TABLE` obtém `ACCESS EXCLUSIVE`, normalmente por pouco tempo para colunas anuláveis sem default.
- O backfill atualiza apenas assinaturas já isentas que não possuam motivo ou data de concessão.
- A criação do índice lê `company_subscriptions` e pode concorrer com escrita; a migration usa `lock_timeout = 5s` e `statement_timeout = 60s`.
- A constraint valida todas as linhas existentes. Em base grande, considerar janela de manutenção.
- Empresas, planos, preços, credenciais profissionais e identificadores Asaas não são modificados.

## Verificação antes de uma reaplicação ou auditoria

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'company_subscriptions'
  and column_name like 'exemption_%'
order by ordinal_position;

select company_id, count(*)
from public.company_subscriptions
group by company_id having count(*) > 1;
```

## Verificação depois

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'company_subscriptions'
  and column_name in ('exemption_reason', 'exemption_ends_at', 'exemption_granted_by', 'exemption_granted_at')
order by column_name;

select proname, proacl
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('grant_company_billing_exemption', 'revoke_company_billing_exemption');

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.company_subscriptions'::regclass
  and conname = 'company_subscription_exemption_metadata_consistent';

select company_id, status, billing_exempt, billing_enabled, exemption_reason,
       exemption_ends_at, exemption_granted_by, exemption_granted_at
from public.company_subscriptions
where billing_exempt = true;
```

## Rollback

O rollback completo está em `202608060001_company_subscription_exemptions.rollback.sql`. Ele remove as funções, índice, constraint e as quatro colunas; portanto, também apaga os metadados de isenção nelas armazenados. Deve ser usado apenas após exportar esses dados e interromper o uso das ações administrativas.
