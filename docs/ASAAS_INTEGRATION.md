# Integração Asaas

## Separação financeira

- Sinais: credencial da subconta da empresa, carregada por `company_id` e nunca enviada ao navegador.
- Mensalidades: credencial exclusiva da conta-pai (`ASAAS_PLATFORM_API_KEY`), sem reutilizar chave de profissional.

## IDs

`asaas_checkout_id` guarda o UUID retornado por `POST /checkouts`. `asaas_payment_id` guarda somente o ID real da cobrança retornado em `payment.id` ou por `GET /payments?checkoutSession=...`; normalmente começa com `pay_`.

## Reconexão de conta existente

A identidade do login BeautyFlow não precisa coincidir com o e-mail financeiro do Asaas. Para o Studio BeautyFlow, a credencial correta deve identificar a conta PJ cujo e-mail financeiro é `170114317@aluno.unb.br`; a credencial atualmente vinculada identifica outra pessoa e não deve ser reutilizada.

A rota administrativa `/painel/admin/empresas/reconectar` implementa apenas a primeira fase: consulta `GET /myAccount/commercialInfo/` e `GET /wallets/`, compara nome, e-mail, `accountId` e `walletId` com os valores esperados e descarta a chave ao fim da requisição. A persistência permanece propositalmente ausente até aprovação explícita.

## Cancelamento e estorno

- Checkout pendente: `POST /checkouts/{checkoutId}/cancel`.
- Cobrança recebida: consultar `GET /payments/{paymentId}` e `GET /payments/{paymentId}/refunds`; estornar por `POST /payments/{paymentId}/refund`.
- Estornos `PENDING` não são reenviados. O banco só recebe `refunded` após `DONE`/`REFUNDED`.

## Inconsistência conhecida

Em 2026-08-05, leitura da credencial criptografada do Studio BeautyFlow identificou titular diferente do esperado. Não trocar credenciais nem regenerar chaves sem confirmar a conta correta e obter aprovação. Registros históricos ambíguos devem permanecer para revisão manual.
