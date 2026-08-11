import { describe, expect, it } from "vitest";
import { validateAsaasConnectionIdentity } from "./connection-identity";

const returned = { name: "Titular Produção", email: "financeiro@studio.test", cpfCnpj: "12.345.678/0001-90" };

describe("identidade de conexão Asaas por ambiente", () => {
  it("prioriza CPF/CNPJ confiável quando cadastrado", () => {
    expect(validateAsaasConnectionIdentity({
      environment: "production",
      expected: { name: null, email: "outro@studio.test", cpfCnpj: "12345678000190" },
      returned,
    }).matchedBy).toBe("cpf_cnpj");
  });

  it("usa o e-mail específico de Production no primeiro cadastro sem documento confiável", () => {
    expect(validateAsaasConnectionIdentity({
      environment: "production",
      expected: { name: null, email: null, cpfCnpj: null },
      returned,
      proposedProductionEmail: "financeiro@studio.test",
    })).toMatchObject({ matchedBy: "email", expectedEmail: "financeiro@studio.test" });
  });

  it("não aceita a identidade Sandbox como substituta da identidade Production", () => {
    expect(() => validateAsaasConnectionIdentity({
      environment: "production",
      expected: { name: null, email: null, cpfCnpj: null },
      returned,
      proposedProductionEmail: "sandbox@studio.test",
    })).toThrow(/não corresponde/);
  });

  it("não permite trocar uma identidade já cadastrada pelo navegador", () => {
    expect(() => validateAsaasConnectionIdentity({
      environment: "production",
      expected: { name: null, email: "financeiro@studio.test", cpfCnpj: null },
      returned: { ...returned, email: "invasor@studio.test" },
      proposedProductionEmail: "invasor@studio.test",
    })).toThrow(/não corresponde/);
  });
});
