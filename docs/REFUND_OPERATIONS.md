# Operações de reembolso

## Migration pendente

O SQL completo está versionado em `supabase/migrations/202608050002_appointment_refund_operations.sql` e não foi aplicado.

Impacto:

- cria `appointment_refund_operations`, sem alterar registros existentes;
- mantém operações automáticas e manuais separadas de `appointments`;
- não adiciona valores a `payment_status`;
- cria índices por agendamento e empresa/status;
- bloqueia acesso de `anon` e `authenticated`;
- permite ao `service_role` operar a tabela e executar uma função transacional;
- a função registra o reembolso manual e muda somente `appointments.status` para `cancelled`, preservando `payment_status=received`.

## Verificação antes

```sql
select to_regclass('public.appointment_refund_operations');
select to_regprocedure('public.confirm_manual_appointment_refund(uuid,uuid,integer,text,text,uuid,text)');
```

Ambas devem retornar `null` antes da aplicação.

## Verificação depois

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointment_refund_operations'
order by ordinal_position;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.appointment_refund_operations'::regclass;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointment_refund_operations';

select relrowsecurity
from pg_class
where oid = 'public.appointment_refund_operations'::regclass;

select has_table_privilege('service_role', 'public.appointment_refund_operations', 'SELECT,INSERT,UPDATE');
select has_function_privilege('service_role', 'public.confirm_manual_appointment_refund(uuid,uuid,integer,text,text,uuid,text)', 'EXECUTE');
```

## Rollback

O rollback completo está em `supabase/migrations/202608050002_appointment_refund_operations.rollback.sql`. Ele remove a função e a tabela; portanto, apaga todo o histórico criado após a aplicação e só deve ser usado após exportação dos registros.
