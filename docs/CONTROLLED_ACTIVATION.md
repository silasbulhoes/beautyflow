# Revisão consolidada para ativação controlada

## Estado em 06/08/2026

As migrations `202608050001_platform_billing.sql`, `202608050002_appointment_refund_operations.sql` e `202608060001_company_subscription_exemptions.sql` já foram aplicadas com sucesso no Supabase. As etapas abaixo permanecem como histórico operacional e roteiro de verificação; não devem ser reaplicadas sem conferir a tabela de migrations do ambiente.

## Ordem proposta

1. Backup e consultas de verificação inicial.
2. `202608050001_platform_billing.sql`.
3. Verificação de tabelas, constraints, índices, RLS, grants e planos.
4. `202608050002_appointment_refund_operations.sql`.
5. Verificação da tabela e função de reembolso.
6. Prévia e, em aprovação separada, `20260805_studio_billing_exemption.sql`.

## Compatibilidade da auditoria existente

O OpenAPI real confirmou todas as dez colunas esperadas, tipos, nulabilidade, PK e defaults. Também confirmou a FK `company_id -> companies.id`. Elementos não expostos pelo OpenAPI são conferidos por SQL antes/depois. A migration usa `create table if not exists`, cria FKs somente quando nenhuma equivalente existe, cria o índice com `if not exists`, habilita RLS, revoga acesso de usuários comuns e concede acesso explícito ao `service_role`.

O rollback de billing não remove `admin_audit_logs`, pois ela precede a migration e pode conter registros de outras funcionalidades.

## Locks

DDL pode solicitar `ACCESS EXCLUSIVE` brevemente nas tabelas criadas/alteradas. `lock_timeout=5s` faz a transação falhar em vez de aguardar indefinidamente. A adição eventual de FK à auditoria valida as linhas existentes e pode levar mais tempo conforme o volume; atualmente a tabela é pequena, mas deve ser conferida antes. Os índices das tabelas novas não bloqueiam dados atuais. A função de reembolso usa `SELECT ... FOR UPDATE` apenas no agendamento alvo durante a confirmação manual.

## Dados criados

- três planos com preço zero: `free`, `intermediate`, `advanced`;
- tabelas de assinatura, eventos de billing, execuções/problemas de reconciliação;
- índices, RLS, grants e policies de leitura;
- tabela/função de operações de reembolso;
- nenhum registro de assinatura até o SQL separado do Studio ser aprovado.

## Dados não alterados

- empresas existentes;
- perfis e usuários;
- serviços, clientes e horários;
- agendamentos e seus status;
- pagamentos, checkouts e eventos Asaas existentes;
- credenciais Asaas;
- registros existentes em `admin_audit_logs`.

## Verificação consolidada

```sql
select to_regclass('public.admin_audit_logs');
select to_regclass('public.billing_plans');
select to_regclass('public.company_subscriptions');
select to_regclass('public.platform_billing_events');
select to_regclass('public.payment_reconciliation_runs');
select to_regclass('public.payment_reconciliation_issues');
select to_regclass('public.appointment_refund_operations');

select conrelid::regclass as relation, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.admin_audit_logs'::regclass,
  'public.billing_plans'::regclass,
  'public.company_subscriptions'::regclass,
  'public.appointment_refund_operations'::regclass
)
order by relation::text, conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('admin_audit_logs', 'billing_plans', 'company_subscriptions', 'appointment_refund_operations')
order by tablename, indexname;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('admin_audit_logs', 'billing_plans', 'company_subscriptions', 'appointment_refund_operations');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('admin_audit_logs', 'billing_plans', 'company_subscriptions', 'appointment_refund_operations')
order by table_name, grantee, privilege_type;

select code, name, monthly_price_cents, active
from public.billing_plans
order by display_order;
```
