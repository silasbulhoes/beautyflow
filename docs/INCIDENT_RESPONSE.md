# Resposta a incidentes

## Estorno sem conclusão

- congelar novas tentativas automáticas;
- preservar `confirmed/received` e o horário;
- registrar payment ID, company ID, horários e respostas sem segredos;
- consultar cobrança, refunds, saldo, extrato e logs de ação crítica;
- não interpretar `CANCELLED` como sucesso;
- acionar suporte ou realizar devolução externa;
- registrar devolução externa pelo fluxo manual somente após comprovante.

1. Conter: desabilitar criação de novas operações pela flag apropriada, sem apagar dados.
2. Preservar: salvar logs, IDs, timestamps, hashes de webhook e versão implantada; nunca registrar API keys.
3. Classificar: isolamento multiempresa, credencial incorreta, webhook falso/repetido, cobrança ou estorno duplicado.
4. Reconciliar em modo leitura antes de qualquer correção financeira.
5. Corrigir dados reais somente com backup, SQL revisado e aprovação.
6. Rotacionar credenciais comprometidas no provedor e atualizar o segredo criptografado com auditoria.
7. Validar lint/build/testes e preparar rollback antes do deploy.
8. Documentar causa raiz, impacto, empresas afetadas e prevenção.
