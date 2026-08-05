# Arquitetura do BeautyFlow

## Visão geral

O BeautyFlow é uma aplicação SaaS multiempresa construída com Next.js 16, React 19, TypeScript, Supabase e Asaas. A aplicação reúne as páginas públicas de agendamento, o painel autenticado da profissional e uma área administrativa restrita da plataforma.

## Componentes

- **Next.js App Router:** páginas, Server Actions e Route Handlers.
- **Supabase Auth:** login, recuperação de senha e gestão de sessão.
- **Supabase Postgres:** empresas, perfis, serviços, clientes, agenda e registros operacionais.
- **Asaas:** checkout e cobrança de sinais por subconta; faturamento SaaS pela conta-pai somente quando habilitado.
- **Vercel:** execução da aplicação e das rotas agendadas em produção.

Não há Prisma nem Mercado Pago no fluxo atual.

## Áreas da aplicação

1. **Área pública:** descoberta do negócio, seleção de serviço e horário, identificação da cliente e pagamento de sinal quando exigido.
2. **Painel da profissional:** agenda, clientes, serviços, financeiro e configurações da própria empresa.
3. **Administração do SaaS:** empresas, assinaturas, isenções, reconciliação e auditoria, sempre protegidas por identidade administrativa e MFA.

## Isolamento multiempresa

Todos os recursos de negócio são associados a `company_id`. Consultas e mutações do painel combinam a identidade autenticada com o `company_id` do perfil e filtros explícitos no banco. As políticas RLS continuam sendo a última barreira de isolamento.

Credenciais Asaas de subcontas são criptografadas em repouso e só podem ser descriptografadas no servidor. Uma empresa nunca usa a credencial de outra empresa.

## Separação financeira

Existem dois domínios financeiros independentes:

- **Sinal do agendamento:** pertence à profissional e usa exclusivamente a credencial Asaas da subconta da empresa. O fluxo guarda `asaas_checkout_id` para o checkout e `asaas_payment_id` para a cobrança real.
- **Mensalidade BeautyFlow:** pertence à plataforma e deve usar exclusivamente `ASAAS_PLATFORM_API_KEY` e `ASAAS_PLATFORM_API_URL`. Nunca reutiliza credenciais de subconta.

O faturamento da plataforma nasce desativado. A migration proposta mantém `billing_enabled = false`; nenhuma cobrança ou bloqueio deve ocorrer antes de revisão, testes em Sandbox e aprovação explícita.

## Estados de agendamento

Os valores aceitos por `appointments.status` são:

- `pending_payment`
- `confirmed`
- `cancelled`
- `completed`
- `no_show`
- `expired`

O cancelamento usa sempre `cancelled`, com dois “l”. Os estados de pagamento usados pelo fluxo atual são `pending`, `received`, `not_required`, `expired` e `refunded`.

## Segurança e operação

- Segredos existem somente em variáveis de ambiente ou colunas criptografadas.
- Server Actions validam autenticação, empresa e entrada no servidor.
- Webhooks e rotas internas exigem tokens próprios e registram idempotência.
- Reconciliação limita o lote e só confirma um pagamento com associação inequívoca ao checkout/agendamento.
- Operações externas irreversíveis, migrations e alterações de credenciais exigem aprovação e procedimento de rollback.

## Variáveis principais

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASAAS_API_URL`
- `ASAAS_API_KEY` (conta-pai para administração de subcontas existente)
- `ASAAS_WEBHOOK_TOKEN`
- `ASAAS_ENCRYPTION_KEY`
- `RECONCILIATION_SECRET`
- `PLATFORM_ADMIN_EMAIL`

As variáveis de billing da plataforma devem ser distintas (`ASAAS_PLATFORM_API_URL`, `ASAAS_PLATFORM_API_KEY` e `ASAAS_PLATFORM_WEBHOOK_TOKEN`) antes de qualquer ativação futura.
