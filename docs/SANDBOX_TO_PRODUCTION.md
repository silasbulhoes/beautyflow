# Sandbox para Produção

Não transportar `accountId`, `walletId`, customer, checkout, payment, refund ou subscription do Sandbox. A conta do Studio atualmente opera com chave validada mesmo sem `accountId`/`walletId`; recursos dependentes de wallet, como split, ficam indisponíveis até recuperação oficial.

Antes da troca:

- configurar credenciais separadas para sinais e billing da plataforma;
- validar que nenhuma variável pública contém segredo;
- publicar webhook na Vercel e validar token/ambiente;
- executar pagamento real de baixo valor e um único estorno controlado;
- confirmar destino do sinal na conta da profissional;
- manter enforcement de mensalidade desligado durante observação.

1. Fazer backup lógico e registrar schema/constraints/RLS.
2. Revisar migrations e aplicar primeiro em ambiente de homologação.
3. Configurar URLs e chaves de Produção separadas das de Sandbox.
4. Reconectar cada subconta; não reutilizar account, wallet, customer, checkout, payment ou subscription IDs de Sandbox.
5. Publicar webhook da Vercel e validar token, ambiente e idempotência.
6. Configurar segredo de reconciliação e manter billing enforcement desligado.
7. Executar o checklist do primeiro pagamento com valor baixo após aprovação.
8. Confirmar conta recebedora, agenda, financeiro e estorno.
9. Rollback: desabilitar criação de checkout/billing, preservar eventos e restaurar configurações anteriores; nunca apagar histórico financeiro.
