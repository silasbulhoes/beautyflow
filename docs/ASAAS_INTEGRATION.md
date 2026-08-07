# Integração Asaas

## Separação financeira

- Sinais: credencial da subconta da empresa, carregada por `company_id` e nunca enviada ao navegador.
- Mensalidades: credencial exclusiva da conta-pai (`ASAAS_PLATFORM_API_KEY`), sem reutilizar chave de profissional.

## IDs

`asaas_checkout_id` guarda o UUID retornado por `POST /checkouts`. `asaas_payment_id` guarda somente o ID real da cobrança retornado em `payment.id` ou por `GET /payments?checkoutSession=...`; normalmente começa com `pay_`.

## Reconexão de conta existente

A identidade do login BeautyFlow não precisa coincidir com o e-mail financeiro do Asaas. Para o Studio BeautyFlow, a credencial correta deve identificar a conta PJ cujo e-mail financeiro é `170114317@aluno.unb.br`; a credencial atualmente vinculada identifica outra pessoa e não deve ser reutilizada.

A rota administrativa `/painel/admin/empresas/reconectar` valida `GET /myAccount/commercialInfo/`, `GET /wallets/` e o status da conta. A persistência exige MFA, prévia mascarada, token autenticado de curta duração, nova validação no Asaas, confirmação explícita e auditoria. Sem a tabela de auditoria, nenhuma credencial é alterada.

A credencial validada pode criar checkouts mesmo quando a API não retorna `accountId` ou `walletId`. Esses IDs nunca são inventados nem herdados de outra credencial; recursos dependentes de wallet permanecem indisponíveis.

## Cancelamento e estorno

- Checkout pendente: `POST /checkouts/{checkoutId}/cancel`.
- Cobrança recebida: consultar `GET /payments/{paymentId}` e `GET /payments/{paymentId}/refunds`; estornar por `POST /payments/{paymentId}/refund`.
- Estornos `PENDING` não são reenviados. O banco só recebe `refunded` após `DONE`/`REFUNDED`.

### Limitação confirmada no Sandbox em 2026-08-05

A cobrança Sandbox `pay_a0rzwj8luod6m9pu` permaneceu `RECEIVED`. Seis solicitações de estorno — inclusive uma iniciada pelo painel Asaas — terminaram `CANCELLED`, apesar de saldo suficiente. Nenhuma devolução foi concluída e o BeautyFlow preservou corretamente o atendimento como `confirmed/received` e o horário bloqueado.

- `DONE` ou pagamento `REFUNDED`: atualizar para `cancelled/refunded`.
- `PENDING`: manter confirmado e não repetir o pedido.
- `AWAITING_CRITICAL_ACTION_AUTHORIZATION`: aguardar autorização e não repetir.
- `CANCELLED`: devolução não realizada; manter `confirmed/received` e orientar suporte ou reembolso manual.

Esse comportamento externo do Sandbox deve ser retestado uma única vez, com valor baixo e aprovação explícita, antes da produção.

## Reembolso manual

A migration `202608050002_appointment_refund_operations.sql` cria histórico próprio e a função transacional `confirm_manual_appointment_refund`. O fluxo não chama o Asaas, exige confirmação explícita, registra responsável, valor, observação e comprovante opcional, cancela o atendimento e preserva `payment_status=received` como histórico do recebimento original.

## Inconsistência conhecida

Em 2026-08-05, a credencial anterior identificou titular diferente. A nova credencial foi validada para `SILAS RIBEIRO BULHOES DE SOUZA` e `170114317@aluno.unb.br`; não voltar a utilizar a credencial anterior. Registros históricos ambíguos permanecem para revisão manual.
