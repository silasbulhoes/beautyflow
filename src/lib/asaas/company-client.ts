import "server-only";

import { decryptSecret } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

type CompanyAsaasCredentials = {
  apiKey: string;
  apiUrl: string;
  accountId: string | null;
  walletId: string | null;
  usingSubaccount: boolean;
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

  const { data: company, error } = await adminSupabase
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
      error,
    );

    throw new Error(
      "Não foi possível consultar a conta financeira.",
    );
  }

  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const hasSubaccount =
    Boolean(company.asaas_account_id) &&
    Boolean(company.asaas_wallet_id) &&
    Boolean(company.asaas_api_key_encrypted);

  if (hasSubaccount) {
    try {
      return {
        apiKey: decryptSecret(
          company.asaas_api_key_encrypted,
        ),
        apiUrl,
        accountId: company.asaas_account_id,
        walletId: company.asaas_wallet_id,
        usingSubaccount: true,
      };
    } catch (error) {
      console.error(
        "Erro ao descriptografar chave da subconta:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );

      throw new Error(
        "Não foi possível acessar a conta financeira da profissional.",
      );
    }
  }

  const centralApiKey = process.env.ASAAS_API_KEY;

  if (!centralApiKey) {
    throw new Error(
      "ASAAS_API_KEY não foi configurada.",
    );
  }

  return {
    apiKey: centralApiKey,
    apiUrl,
    accountId: null,
    walletId: null,
    usingSubaccount: false,
  };
}