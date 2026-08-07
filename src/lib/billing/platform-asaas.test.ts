import { afterEach, describe, expect, it } from "vitest";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("platform Asaas config", () => {
  it("mantém enforcement desligado por padrão", async () => {
    delete process.env.BILLING_ENFORCEMENT_ENABLED;
    const { isBillingEnforcementEnabled } = await import("./platform-asaas-config");
    expect(isBillingEnforcementEnabled()).toBe(false);
  });

  it("rejeita URL de produção declarada como Sandbox", async () => {
    process.env.ASAAS_PLATFORM_API_URL = "https://api.asaas.com/v3";
    process.env.ASAAS_PLATFORM_API_KEY = "secret-for-test";
    process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = "webhook-for-test";
    process.env.ASAAS_PLATFORM_ENVIRONMENT = "sandbox";
    const { getPlatformAsaasConfig } = await import("./platform-asaas-config");
    expect(() => getPlatformAsaasConfig()).toThrow(/não corresponde/);
  });

  it("aceita configuração Sandbox consistente", async () => {
    process.env.ASAAS_PLATFORM_API_URL = "https://api-sandbox.asaas.com/v3/";
    process.env.ASAAS_PLATFORM_API_KEY = "secret-for-test";
    process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = "webhook-for-test";
    process.env.ASAAS_PLATFORM_ENVIRONMENT = "sandbox";
    const { getPlatformAsaasConfig } = await import("./platform-asaas-config");
    expect(getPlatformAsaasConfig()).toMatchObject({ environment: "sandbox", apiUrl: "https://api-sandbox.asaas.com/v3" });
  });
});
