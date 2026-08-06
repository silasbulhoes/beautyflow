export type PlatformAsaasEnvironment = "sandbox" | "production";

export type PlatformAsaasConfig = {
  apiUrl: string;
  apiKey: string;
  webhookToken: string;
  environment: PlatformAsaasEnvironment;
};

export function isBillingEnforcementEnabled() {
  return process.env.BILLING_ENFORCEMENT_ENABLED === "true";
}

export function getPlatformAsaasConfig(): PlatformAsaasConfig {
  const apiUrl = process.env.ASAAS_PLATFORM_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.ASAAS_PLATFORM_API_KEY?.trim();
  const webhookToken = process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN?.trim();
  const environment = process.env.ASAAS_PLATFORM_ENVIRONMENT?.trim();

  if (!apiUrl || !apiKey || !webhookToken) {
    throw new Error("A integração de mensalidades da plataforma não está configurada.");
  }
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("ASAAS_PLATFORM_ENVIRONMENT deve ser sandbox ou production.");
  }
  const urlIsSandbox = apiUrl.toLowerCase().includes("sandbox");
  if ((environment === "sandbox" && !urlIsSandbox) || (environment === "production" && urlIsSandbox)) {
    throw new Error("A URL do Asaas não corresponde ao ambiente de billing informado.");
  }
  return { apiUrl, apiKey, webhookToken, environment };
}
