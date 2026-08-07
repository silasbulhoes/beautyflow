import "server-only";

import { decryptSecret } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyAsaasCredentials = {
  apiKey: string;
  apiUrl: string;
  accountId: string | null;
  walletId: string | null;
  usingSubaccount: true;
};

export async function getCompanyAsaasCredentials(
  companyId: string,
): Promise<CompanyAsaasCredentials> {
  const apiUrl =
    process.env.ASAAS_API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error(
      "ASAAS_API_URL não foi configurada.",
    );
  }

  const adminSupabase = createAdminClient();

  const { data: company, error } =
    await adminSupabase
      .from("companies")
      .select(`
        id,
        asaas_account_id,
        asaas_wallet_id,
        asaas_api_key_encrypted,
        asaas_account_status
      `)
      .eq("id", companyId)
      .maybeSingle();

  if (error) {
    console.error(
      "Erro ao consultar integração Asaas da empresa:",
      {
        code: error.code,
        message: error.message,
        companyId,
      },
    );

    throw new Error(
      "Não foi possível consultar a conta financeira.",
    );
  }

  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const accountId = String(
    company.asaas_account_id ?? "",
  ).trim();

  const walletId = String(
    company.asaas_wallet_id ?? "",
  ).trim();

  const encryptedApiKey = String(
    company.asaas_api_key_encrypted ?? "",
  ).trim();

  const hasUsableCredential = Boolean(encryptedApiKey);

  if (!hasUsableCredential) {
    console.error(
      "Empresa sem integração financeira completa:",
      {
        companyId,
        hasAccountId: Boolean(accountId),
        hasWalletId: Boolean(walletId),
        hasEncryptedApiKey:
          Boolean(encryptedApiKey),
      },
    );

    throw new Error(
      "A profissional ainda não configurou sua conta financeira.",
    );
  }

  try {
    const apiKey = decryptSecret(
      encryptedApiKey,
    );

    if (!apiKey.trim()) {
      throw new Error(
        "A chave descriptografada está vazia.",
      );
    }

    return {
      apiKey,
      apiUrl,
      accountId: accountId || null,
      walletId: walletId || null,
      usingSubaccount: true,
    };
  } catch (error) {
    console.error(
      "Erro ao descriptografar chave da subconta:",
      {
        companyId,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",
      },
    );

    throw new Error(
      "Não foi possível acessar a conta financeira da profissional.",
    );
  }
}
