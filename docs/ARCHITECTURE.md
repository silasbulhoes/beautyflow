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
- Estornos Asaas e reembolsos manuais possuem histórico próprio em `appointment_refund_operations`; um reembolso manual preserva o recebimento original em `payment_status` e registra separadamente a devolução.

## Variáveis principais

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `ASAAS_API_URL`
- `ASAAS_API_KEY` (conta-pai legada Sandbox-only; nunca acompanha o runtime Production)
- `ASAAS_WEBHOOK_TOKEN`
- `SUBACCOUNT_ENCRYPTION_KEY`
- `RECONCILIATION_SECRET`
- `BEAUTYFLOW_ADMIN_EMAILS`
- `NEXT_PUBLIC_APP_URL`
- `PRIVACY_CONTACT_EMAIL`

As variáveis de billing da plataforma devem ser distintas (`ASAAS_PLATFORM_API_URL`, `ASAAS_PLATFORM_API_KEY`, `ASAAS_PLATFORM_WEBHOOK_TOKEN` e `ASAAS_PLATFORM_ENVIRONMENT`) antes de qualquer ativação futura.

A reconexão administrativa pode validar e pré-cadastrar uma conexão profissional de outro ambiente usando a URL oficial fixa escolhida no formulário. Essa exceção não se aplica a checkout, payment, refund, cancelamento, webhook ou reconciliação, que continuam presos a `ASAAS_ENVIRONMENT`.

Para administrar futuramente uma conta-pai de Produção, criar um fluxo separado com `ASAAS_PARENT_API_KEY`, `ASAAS_PARENT_API_URL` e `ASAAS_PARENT_ENVIRONMENT`. Até essa mudança explícita, listagem, criação e recuperação de subcontas pela chave-pai legada permanecem forçadas ao Sandbox.
