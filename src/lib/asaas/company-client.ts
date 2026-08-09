import "server-only";

import { assertAsaasEnvironment, AsaasEnvironment, getProfessionalAsaasRuntime } from "@/lib/asaas/environment";
import { decryptSecret } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyAsaasCredentials = {
  apiKey: string;
  apiUrl: string;
  accountId: string | null;
  walletId: string | null;
  environment: AsaasEnvironment;
  usingSubaccount: true;
};

export async function getCompanyAsaasCredentials(
  companyId: string,
  recordEnvironment?: unknown,
): Promise<CompanyAsaasCredentials> {
  const runtime = getProfessionalAsaasRuntime();
  if (recordEnvironment != null) {
    assertAsaasEnvironment(recordEnvironment, runtime.environment, "registro financeiro");
  }

  const adminSupabase = createAdminClient();
  const { data: connection, error } = await adminSupabase
    .from("company_asaas_connections")
    .select("id, company_id, environment, account_id, wallet_id, api_key_encrypted, account_status")
    .eq("company_id", companyId)
    .eq("environment", runtime.environment)
    .maybeSingle();

  if (error) {
    console.error("Erro ao consultar integracao Asaas da empresa:", {
      code: error.code,
      message: error.message,
      companyId,
      environment: runtime.environment,
    });
    throw new Error("Nao foi possivel consultar a conta financeira.");
  }

  if (!connection) {
    throw new Error(`A empresa nao possui conexao Asaas ${runtime.environment} configurada.`);
  }

  assertAsaasEnvironment(connection.environment, runtime.environment, "conexao Asaas");
  const accountId = String(connection.account_id ?? "").trim();
  const walletId = String(connection.wallet_id ?? "").trim();
  const encryptedApiKey = String(connection.api_key_encrypted ?? "").trim();

  if (!encryptedApiKey) {
    console.error("Empresa sem credencial financeira no ambiente:", {
      companyId,
      environment: runtime.environment,
      hasAccountId: Boolean(accountId),
      hasWalletId: Boolean(walletId),
    });
    throw new Error("A profissional ainda nao configurou sua conta financeira neste ambiente.");
  }

  try {
    const apiKey = decryptSecret(encryptedApiKey);
    if (!apiKey.trim()) throw new Error("A chave descriptografada esta vazia.");
    return {
      apiKey,
      apiUrl: runtime.apiUrl,
      accountId: accountId || null,
      walletId: walletId || null,
      environment: runtime.environment,
      usingSubaccount: true,
    };
  } catch (error) {
    console.error("Erro ao descriptografar chave da conexao Asaas:", {
      companyId,
      environment: runtime.environment,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    throw new Error("Nao foi possivel acessar a conta financeira da profissional.");
  }
}
