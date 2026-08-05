# Billing da plataforma

A migration `202608050001_platform_billing.sql` prepara planos, assinaturas, eventos, auditoria e reconciliação. Ela não foi aplicada automaticamente.

Princípios:

- preços vêm de `billing_plans`, nunca de strings espalhadas;
- `billing_enabled` nasce falso;
- empresas isentas usam `billing_exempt=true`, `status=exempt` e não possuem assinatura Asaas;
- enforcement nasce desativado por `BILLING_ENFORCEMENT_ENABLED=false`;
- nenhuma cobrança deve ser criada sem ativação administrativa explícita;
- sinais e mensalidades possuem credenciais e webhooks separados.

Antes de habilitar cobrança, configurar e validar `ASAAS_PLATFORM_API_URL`, `ASAAS_PLATFORM_API_KEY` e `ASAAS_PLATFORM_WEBHOOK_TOKEN` em Sandbox.
