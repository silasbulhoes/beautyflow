import { describe, expect, it } from "vitest";
import { assertAsaasEnvironment, environmentFromAsaasApiUrl, getProfessionalAsaasRuntime, parseAsaasEnvironment } from "./environment";

describe("isolamento de ambiente profissional Asaas", () => {
  it("aceita Preview configurado para Sandbox", () => {
    expect(getProfessionalAsaasRuntime("sandbox", "https://api-sandbox.asaas.com/v3/")).toEqual({ environment: "sandbox", apiUrl: "https://api-sandbox.asaas.com/v3" });
  });
  it("aceita Production configurada para Producao", () => {
    expect(getProfessionalAsaasRuntime("production", "https://api.asaas.com/v3")).toEqual({ environment: "production", apiUrl: "https://api.asaas.com/v3" });
  });
  it("bloqueia URL de Producao no Sandbox", () => {
    expect(() => getProfessionalAsaasRuntime("sandbox", "https://api.asaas.com/v3")).toThrow(/pertence a production/);
  });
  it("bloqueia URL de Sandbox em Producao", () => {
    expect(() => getProfessionalAsaasRuntime("production", "https://api-sandbox.asaas.com/v3")).toThrow(/pertence a sandbox/);
  });
  it("bloqueia recurso persistido em outro ambiente", () => {
    expect(() => assertAsaasEnvironment("production", "sandbox", "pagamento")).toThrow(/pagamento pertence/);
  });
  it("rejeita ambiente ausente e host nao oficial", () => {
    expect(() => parseAsaasEnvironment(undefined)).toThrow(/ASAAS_ENVIRONMENT/);
    expect(() => environmentFromAsaasApiUrl("https://example.com/v3")).toThrow(/host oficial/);
  });
});
