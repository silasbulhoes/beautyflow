"use server";

import { isAdminEmail } from "@/lib/admin-access";
import { asaasRequest } from "@/lib/asaas/request";
import { createClient } from "@/lib/supabase/server";

export type ReconnectValidationState = {
  error?: string;
  success?: string;
  identity?: {
    name: string;
    email: string;
    accountId: string;
    walletId: string;
  };
};

type CommercialInfo = {
  id?: string;
  accountId?: string;
  name?: string;
  companyName?: string;
  email?: string;
};

type WalletResponse = {
  id?: string;
  walletId?: string;
};

function read(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export async function validarReconexaoAsaas(
  _previousState: ReconnectValidationState,
  formData: FormData,
): Promise<ReconnectValidationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return { error: "Acesso restrito à administração." };
  }

  const assurance =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    assurance.error ||
    assurance.data.currentLevel !== "aal2"
  ) {
    return {
      error: "Confirme o segundo fator antes de validar uma credencial financeira.",
    };
  }

  const apiUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
  const apiKey = read(formData, "apiKey");
  const expectedName = read(formData, "expectedName");
  const expectedEmail = read(formData, "expectedEmail");
  const expectedAccountId = read(formData, "expectedAccountId");
  const expectedWalletId = read(formData, "expectedWalletId");

  if (
    !apiUrl ||
    !apiKey ||
    !expectedName ||
    !expectedEmail ||
    !expectedAccountId ||
    !expectedWalletId
  ) {
    return {
      error:
        "Informe a identidade esperada completa e uma chave de API para validação.",
    };
  }

  try {
    const [commercial, wallet] = await Promise.all([
      asaasRequest<CommercialInfo>({
        apiUrl,
        apiKey,
        path: "/myAccount/commercialInfo/",
      }),
      asaasRequest<WalletResponse>({
        apiUrl,
        apiKey,
        path: "/wallets/",
      }),
    ]);

    const identity = {
      name: String(commercial.companyName ?? commercial.name ?? "").trim(),
      email: String(commercial.email ?? "").trim(),
      accountId: String(
        commercial.accountId ?? commercial.id ?? "",
      ).trim(),
      walletId: String(wallet.walletId ?? wallet.id ?? "").trim(),
    };

    const mismatches = [
      normalize(identity.name) === normalize(expectedName)
        ? null
        : "nome",
      normalize(identity.email) === normalize(expectedEmail)
        ? null
        : "e-mail",
      identity.accountId === expectedAccountId ? null : "accountId",
      identity.walletId === expectedWalletId ? null : "walletId",
    ].filter(Boolean);

    if (mismatches.length > 0) {
      return {
        error: `A credencial não corresponde à identidade esperada. Divergências: ${mismatches.join(
          ", ",
        )}. Nenhum dado foi salvo.`,
        identity,
      };
    }

    return {
      success:
        "Identidade validada em modo somente leitura. A chave não foi armazenada e o Supabase não foi alterado.",
      identity,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Não foi possível validar a credencial: ${error.message}`
          : "Não foi possível validar a credencial.",
    };
  }
}
