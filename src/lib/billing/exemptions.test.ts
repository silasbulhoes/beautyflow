import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exemptionLabel, validateExemptionAccess, validateGrantInput, validateRevokeInput } from "./exemptions";

const migration = readFileSync("supabase/migrations/202608060001_company_subscription_exemptions.sql", "utf8");

describe("billing exemptions", () => {
  const grant = (overrides = {}) => validateGrantInput({ planCode: "advanced", activePlanCount: 1, reason: "Cortesia comercial", endsAt: "", confirmation: "CONCEDER ISENÇÃO", ...overrides });
  const access = (overrides = {}) => validateExemptionAccess({ isAdmin: true, assuranceLevel: "aal2", companyCount: 1, subscriptionCount: 0, ...overrides });

  it("aceita concessão permanente para empresa sem assinatura", () => {
    access();
    expect(grant().endsAt).toBeNull();
    expect(exemptionLabel(true, null)).toBe("Isenta permanentemente");
  });

  it("permite trocar o plano de uma empresa isenta", () => {
    expect(grant({ planCode: "intermediate" }).planCode).toBe("intermediate");
    expect(migration).toContain("billing_plan_id = excluded.billing_plan_id");
  });

  it("remove isenção somente com motivo e confirmação", () => {
    expect(validateRevokeInput({ reason: "Fim da cortesia", confirmation: "REMOVER ISENÇÃO" })).toEqual({ reason: "Fim da cortesia" });
    expect(migration).toContain("status = 'pending'");
  });

  it("mantém cobrança desativada após remoção e não chama Asaas", () => {
    expect(migration).toContain("billing_enabled = false");
    expect(migration.toLowerCase()).not.toContain("http_");
    expect(migration.toLowerCase()).not.toContain("asaas.com");
  });

  it("rejeita empresa inexistente", () => expect(() => access({ companyCount: 0 })).toThrow("Empresa não encontrada"));
  it("rejeita plano inválido ou inativo", () => {
    expect(() => grant({ planCode: "enterprise" })).toThrow("Plano inválido");
    expect(() => grant({ activePlanCount: 0 })).toThrow("Plano ativo não encontrado");
  });
  it("rejeita usuário não administrador", () => expect(() => access({ isAdmin: false })).toThrow("Não autorizado"));
  it("rejeita sessão sem MFA aal2", () => expect(() => access({ assuranceLevel: "aal1" })).toThrow("segundo fator"));

  it("torna operações repetidas idempotentes", () => {
    expect(migration).toContain("return v_subscription.id;");
    expect(migration).toContain("is not distinct from p_ends_at");
  });

  it("isola por empresa e exige no máximo uma assinatura", () => {
    expect(() => access({ subscriptionCount: 2 })).toThrow("mais de uma assinatura");
    expect(migration).toContain("where company_id = p_company_id");
    expect(migration).toContain("and company_id = p_company_id");
  });

  it("grava auditoria obrigatória na mesma função transacional", () => {
    expect(migration).toContain("insert into public.admin_audit_logs");
    expect(migration).toContain("'grant_billing_exemption'");
    expect(migration).toContain("'revoke_billing_exemption'");
    expect(migration).not.toContain("exception when");
  });
});
