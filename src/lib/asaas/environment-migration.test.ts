import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608070001_company_asaas_environment_isolation.sql"),
  "utf8",
);
const webhookRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/webhooks/asaas/route.ts"),
  "utf8",
);
const reconciliation = readFileSync(
  resolve(process.cwd(), "src/lib/appointments/reconcile-payments.ts"),
  "utf8",
);

describe("migration de isolamento Asaas", () => {
  it("permite credenciais distintas da mesma empresa por ambiente", () => {
    expect(sql).toContain("unique (company_id, environment)");
    expect(sql).toContain("environment in ('sandbox', 'production')");
  });

  it("preserva a credencial legada e a copia somente para Sandbox", () => {
    expect(sql).toContain("c.asaas_api_key_encrypted");
    expect(sql).toContain("c.id, 'sandbox', c.asaas_api_key_encrypted");
    expect(sql).not.toMatch(/update\s+public\.companies/i);
    expect(sql).not.toMatch(/alter table\s+public\.companies\s+drop/i);
  });

  it("marca o historico profissional e mantem agendamentos sem Asaas nulos", () => {
    expect(sql).toContain("alter table public.appointments add column asaas_environment text");
    expect(sql).toContain("nullif(trim(asaas_checkout_id), '') is not null");
    expect(sql).toContain("nullif(trim(asaas_payment_id), '') is not null");
    expect(sql).not.toContain("update public.appointments set asaas_environment = 'sandbox';");
  });

  it("isola refund, reconciliacao e webhook", () => {
    expect(sql).toContain("alter table public.appointment_refund_operations add column asaas_environment");
    expect(sql).toContain("alter table public.payment_reconciliation_runs add column asaas_environment");
    expect(sql).toContain("alter table public.payment_reconciliation_issues add column asaas_environment");
    expect(sql).toContain("alter table public.asaas_webhook_events add column asaas_environment");
  });

  it("impede webhook de localizar ou atualizar agendamento de outro ambiente", () => {
    expect(webhookRoute).toContain('.eq("environment", runtime.environment)');
    expect(webhookRoute).toContain('.eq("asaas_environment", environment)');
    expect(webhookRoute).toContain('.eq("asaas_environment", runtime.environment)');
    expect(webhookRoute).toContain('p_event_id: `${runtime.environment}:${eventId}`');
  });

  it("reconciliacao seleciona e atualiza somente o ambiente da execucao", () => {
    expect(reconciliation).toContain('.eq("asaas_environment", runtime.environment)');
    expect(reconciliation).toContain("getCompanyAsaasCredentials(appointment.company_id, appointment.asaas_environment)");
  });
});
