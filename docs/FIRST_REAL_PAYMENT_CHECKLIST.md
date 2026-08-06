# Primeiro pagamento real

Executar somente com aprovação explícita.

- [ ] Confirmar ambiente Produção e titular da subconta.
- [ ] Criar serviço temporário com sinal baixo.
- [ ] Agendar e confirmar que o horário ficou reservado.
- [ ] Pagar via Pix e registrar horário/valor.
- [ ] Confirmar webhook autêntico e `asaas_payment_id` no formato de cobrança.
- [ ] Confirmar appointment `confirmed/received` e lançamento financeiro.
- [ ] Confirmar que o saldo entrou na conta da profissional.
- [ ] Cancelar e estornar somente após autorizar a movimentação real.
- [ ] Confirmar estorno no Asaas antes de `cancelled/refunded`.
- [ ] Autorizar previamente ações críticas necessárias.
- [ ] Enviar exatamente um pedido de estorno.
- [ ] Se `PENDING` ou aguardando autorização, apenas consultar novamente.
- [ ] Se `CANCELLED`, manter atendimento confirmado e escalar ao suporte.
- [ ] Só liberar o horário após `DONE` ou pagamento `REFUNDED`.
- [ ] Confirmar no extrato e na conta da cliente que a devolução ocorreu.
- [ ] Testar reconciliação sem duplicar operações.
- [ ] Registrar evidências e remover o serviço temporário apenas se seguro.
