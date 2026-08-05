# Runbook de operações

## Reconciliação

`POST /api/internal/reconcile-payments` exige `Authorization: Bearer <RECONCILIATION_SECRET>`. Processa no máximo 100 reservas pendentes, expira vencidas e só confirma cobrança `RECEIVED` inequivocamente vinculada ao checkout/agendamento.

## Falha Asaas → Supabase

Não repetir cegamente. Consultar cobrança e estornos; a action reconhece estorno existente. Registrar appointment, company, payment e HTTP status sem chaves.

## Reconexão Asaas

Validar a chave por endpoint somente leitura, comparar titular/account/wallet e mostrar a mudança proposta. A gravação de nova credencial exige aprovação e auditoria. Nunca criar outra subconta como tentativa de recuperação.

## Recuperação de senha

Cadastrar no Supabase as Redirect URLs de localhost e Vercel terminando em `/auth/callback`. O formulário sempre retorna mensagem genérica.
