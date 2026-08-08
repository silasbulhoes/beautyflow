export const ASAAS_ENVIRONMENTS = ["sandbox", "production"] as const;

export type AsaasEnvironment = (typeof ASAAS_ENVIRONMENTS)[number];

export function parseAsaasEnvironment(value: unknown): AsaasEnvironment {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "sandbox" || normalized === "production") return normalized;
  throw new Error("ASAAS_ENVIRONMENT deve ser sandbox ou production.");
}

export function environmentFromAsaasApiUrl(apiUrl: string): AsaasEnvironment {
  let hostname: string;
  try {
    hostname = new URL(apiUrl).hostname.toLowerCase();
  } catch {
    throw new Error("ASAAS_API_URL possui formato invalido.");
  }
  if (hostname === "api-sandbox.asaas.com") return "sandbox";
  if (hostname === "api.asaas.com") return "production";
  throw new Error("ASAAS_API_URL nao aponta para um host oficial permitido.");
}

export function getProfessionalAsaasRuntime(
  environmentValue = process.env.ASAAS_ENVIRONMENT,
  apiUrlValue = process.env.ASAAS_API_URL,
) {
  const environment = parseAsaasEnvironment(environmentValue);
  const apiUrl = String(apiUrlValue ?? "").trim().replace(/\/$/, "");
  if (!apiUrl) throw new Error("ASAAS_API_URL nao foi configurada.");
  const urlEnvironment = environmentFromAsaasApiUrl(apiUrl);
  if (urlEnvironment !== environment) {
    throw new Error(`ASAAS_API_URL pertence a ${urlEnvironment}, mas ASAAS_ENVIRONMENT esta definido como ${environment}.`);
  }
  return { environment, apiUrl };
}

export function assertAsaasEnvironment(
  recordEnvironment: unknown,
  runtimeEnvironment: AsaasEnvironment,
  resourceName = "registro Asaas",
): asserts recordEnvironment is AsaasEnvironment {
  const parsed = parseAsaasEnvironment(recordEnvironment);
  if (parsed !== runtimeEnvironment) {
    throw new Error(`${resourceName} pertence ao ambiente ${parsed}; esta execucao usa ${runtimeEnvironment}.`);
  }
}

export function getAsaasCheckoutOrigin(environment: AsaasEnvironment) {
  return environment === "sandbox" ? "https://sandbox.asaas.com" : "https://www.asaas.com";
}
