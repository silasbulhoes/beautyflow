# Billing da plataforma

A migration `202608050001_platform_billing.sql` prepara planos, assinaturas, eventos, auditoria e reconciliação. Ela foi aplicada com sucesso no Supabase em 06/08/2026. O enforcement de cobrança continua desativado.

Princípios:

- preços vêm de `billing_plans`, nunca de strings espalhadas;
- `billing_enabled` nasce falso;
- empresas isentas usam `billing_exempt=true`, `status=exempt` e não possuem assinatura Asaas;
- enforcement nasce desativado por `BILLING_ENFORCEMENT_ENABLED=false`;
- nenhuma cobrança deve ser criada sem ativação administrativa explícita;
- sinais e mensalidades possuem credenciais e webhooks separados.

Antes de habilitar cobrança, configurar e validar `ASAAS_PLATFORM_API_URL`, `ASAAS_PLATFORM_API_KEY`, `ASAAS_PLATFORM_WEBHOOK_TOKEN` e `ASAAS_PLATFORM_ENVIRONMENT` em Sandbox.

## Estado de prontidão

- preços públicos permanecem em zero;
- `billing_enabled` nasce falso e enforcement permanece desligado;
- sinais usam somente a credencial da profissional;
- nenhuma assinatura ou mensalidade real foi criada;
- ativação depende da migration, credenciais exclusivas da conta-pai, preços aprovados, webhook público e teste Sandbox.

O Studio BeautyFlow está confirmado no plano avançado com `status=exempt`, `billing_exempt=true` e `billing_enabled=false`.
