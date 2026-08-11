import "server-only";

import { getAsaasApiUrlForEnvironment } from "@/lib/asaas/environment";

/**
 * A variavel legada ASAAS_API_KEY pertence a conta-pai Sandbox.
 * Uma conta-pai de Producao exigira configuracao ASAAS_PARENT_* separada.
 */
export function getLegacySandboxParentAsaasConfig() {
  return {
    environment: "sandbox" as const,
    apiUrl: getAsaasApiUrlForEnvironment("sandbox"),
    apiKey: process.env.ASAAS_API_KEY?.trim() || null,
  };
}
