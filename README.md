# BeautyFlow

SaaS multiempresa de agendamento para profissionais da beleza, construído com Next.js 16, React 19, Supabase e Asaas.

## Desenvolvimento

1. Copie as variáveis documentadas em `docs/ARCHITECTURE.md` para `.env.local`.
2. Execute `npm install` e `npm run dev`.
3. Valide mudanças com `npm run lint` e `npm run build`.

O login usa Supabase Auth. Sinais de agendamentos usam exclusivamente a credencial criptografada da subconta da profissional. Mensalidades da plataforma, quando habilitadas, devem usar uma credencial separada da conta-pai.

## Documentação

- `docs/ARCHITECTURE.md`: arquitetura e isolamento multiempresa.
- `docs/ASAAS_INTEGRATION.md`: checkouts, cobranças, webhooks e estornos.
- `docs/PLATFORM_BILLING.md`: planos e mensalidades SaaS.
- `docs/SANDBOX_TO_PRODUCTION.md`: migração segura de ambiente.
- `docs/FIRST_REAL_PAYMENT_CHECKLIST.md`: primeiro pagamento real controlado.
- `docs/OPERATIONS_RUNBOOK.md`: operação e reconciliação.
- `docs/INCIDENT_RESPONSE.md`: resposta a incidentes.
- `docs/REFUND_OPERATIONS.md`: estados de estorno e reembolso manual.

Migrations ficam em `supabase/migrations/` e nunca devem ser aplicadas em produção sem revisão, backup e aprovação.

## Qualidade

Execute `npm test`, `npm run lint` e `npm run build`. Testes que dependem de e-mail, webhook público, análise cadastral ou movimentação financeira real permanecem manuais e estão nos checklists operacionais.
