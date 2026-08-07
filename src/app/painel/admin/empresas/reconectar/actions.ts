"use server";

import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-access";
import { asaasRequest } from "@/lib/asaas/request";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TARGET_COMPANY_SLUG = "studio-beautyflow";
const EXPECTED_NAME = "SILAS RIBEIRO BULHOES DE SOUZA";
const EXPECTED_EMAIL = "170114317@aluno.unb.br";
const APPROVAL_PHRASE = "RECONectar STUDIO BEAUTYFLOW";
const APPROVAL_TTL_MS = 10 * 60 * 1000;

export type ReconnectPreview = {
  companyId: string;
  companySlug: string;
  environment: "sandbox" | "production";
  identity: { name: string; email: string; accountId: string; walletId: string };
  current: { apiKey: string; accountId: string; walletId: string; status: string };
  next: { apiKey: string; accountId: string; walletId: string; status: string };
  updateStatement: string;
};

export type ReconnectValidationState = {
  error?: string;
  success?: string;
  identity?: ReconnectPreview["identity"];
  preview?: ReconnectPreview;
  approvalToken?: string;
};

export type ReconnectPersistenceState = {
  error?: string;
  success?: string;
};

type CommercialInfo = { id?: string; accountId?: string; name?: string; companyName?: string; email?: string };
type WalletResponse = { id?: string; walletId?: string } | string;
type AccountStatus = { general?: string };
type ApprovalPayload = {
  version: 1;
  userId: string;
  companyId: string;
  apiKey: string;
  issuedAt: number;
  environment: "sandbox" | "production";
};

function read(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function normalize(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

function mask(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "(vazio)";
  if (normalized.length <= 8) return "••••";
  return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
}

function environmentFromUrl(apiUrl: string): "sandbox" | "production" {
  return apiUrl.toLowerCase().includes("sandbox") ? "sandbox" : "production";
}

function walletIdFromResponse(wallet: WalletResponse) {
  if (typeof wallet === "string") return wallet.trim();
  return String(wallet.walletId ?? wallet.id ?? "").trim();
}

function integrationStatus(status: AccountStatus) {
  const raw = String(status.general ?? "").toUpperCase();
  return raw === "APPROVED" || raw === "ACTIVE" ? "active" : "pending";
}

async function requireAdminAal2() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Acesso restrito à administração.");
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || assurance.data.currentLevel !== "aal2") {
    throw new Error("Confirme o segundo fator antes de alterar uma credencial financeira.");
  }
  return user;
}

async function validateCredential(apiUrl: string, apiKey: string) {
  const [commercial, wallet, status] = await Promise.all([
    asaasRequest<CommercialInfo>({ apiUrl, apiKey, path: "/myAccount/commercialInfo/" }),
    asaasRequest<WalletResponse>({ apiUrl, apiKey, path: "/wallets/" }),
    asaasRequest<AccountStatus>({ apiUrl, apiKey, path: "/myAccount/status/" }),
  ]);
  const identity = {
    name: String(commercial.companyName ?? commercial.name ?? "").trim(),
    email: String(commercial.email ?? "").trim(),
    accountId: String(commercial.accountId ?? commercial.id ?? "").trim(),
    walletId: walletIdFromResponse(wallet),
  };
  if (normalize(identity.name) !== normalize(EXPECTED_NAME) || normalize(identity.email) !== normalize(EXPECTED_EMAIL)) {
    throw new Error("A chave não pertence à identidade financeira esperada do Studio BeautyFlow.");
  }
  return { identity, status: integrationStatus(status), rawStatus: status.general ?? null };
}

export async function validarReconexaoAsaas(
  _previousState: ReconnectValidationState,
  formData: FormData,
): Promise<ReconnectValidationState> {
  try {
    const user = await requireAdminAal2();
    const apiUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
    const apiKey = read(formData, "apiKey");
    if (!apiUrl || !apiKey) return { error: "Informe a nova chave de API." };

    const validated = await validateCredential(apiUrl, apiKey);
    const admin = createAdminClient();
    const { data: company, error } = await admin.from("companies")
      .select("id, slug, asaas_account_id, asaas_wallet_id, asaas_api_key_encrypted, asaas_account_status")
      .eq("slug", TARGET_COMPANY_SLUG).single();
    if (error || !company) return { error: "A empresa studio-beautyflow não foi encontrada." };

    let currentKey = "";
    try {
      currentKey = company.asaas_api_key_encrypted ? decryptSecret(company.asaas_api_key_encrypted) : "";
    } catch { currentKey = ""; }

    const environment = environmentFromUrl(apiUrl);
    const preview: ReconnectPreview = {
      companyId: company.id,
      companySlug: company.slug,
      environment,
      identity: validated.identity,
      current: {
        apiKey: mask(currentKey),
        accountId: mask(company.asaas_account_id),
        walletId: mask(company.asaas_wallet_id),
        status: company.asaas_account_status ?? "(vazio)",
      },
      next: {
        apiKey: mask(apiKey),
        accountId: validated.identity.accountId ? mask(validated.identity.accountId) : "NULL",
        walletId: validated.identity.walletId ? mask(validated.identity.walletId) : "NULL",
        status: validated.status,
      },
      updateStatement: `UPDATE public.companies SET asaas_api_key_encrypted = '[CRIPTOGRAFADA]', asaas_account_id = ${validated.identity.accountId ? "'[ID VALIDADO]'" : "NULL"}, asaas_wallet_id = ${validated.identity.walletId ? "'[WALLET VALIDADO]'" : "NULL"}, asaas_account_status = '${validated.status}', asaas_connected_at = now() WHERE id = '${company.id}' AND slug = '${TARGET_COMPANY_SLUG}';`,
    };
    const payload: ApprovalPayload = { version: 1, userId: user.id, companyId: company.id, apiKey, issuedAt: Date.now(), environment };
    return {
      success: "Credencial validada novamente. Revise a prévia e confirme explicitamente para persistir.",
      identity: validated.identity,
      preview,
      approvalToken: encryptSecret(JSON.stringify(payload)),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível preparar a reconexão." };
  }
}

export async function persistirReconexaoAsaas(
  _previousState: ReconnectPersistenceState,
  formData: FormData,
): Promise<ReconnectPersistenceState> {
  try {
    const user = await requireAdminAal2();
    if (read(formData, "confirmation") !== APPROVAL_PHRASE || read(formData, "confirmed") !== "yes") {
      return { error: "A confirmação explícita não confere." };
    }
    const token = read(formData, "approvalToken");
    const payload = JSON.parse(decryptSecret(token)) as ApprovalPayload;
    if (payload.version !== 1 || payload.userId !== user.id || Date.now() - payload.issuedAt > APPROVAL_TTL_MS) {
      return { error: "A aprovação expirou ou não pertence a este administrador. Valide novamente." };
    }
    const apiUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
    if (!apiUrl || payload.environment !== environmentFromUrl(apiUrl)) {
      return { error: "O ambiente Asaas mudou desde a validação. Nenhum dado foi salvo." };
    }
    const validated = await validateCredential(apiUrl, payload.apiKey);
    const admin = createAdminClient();
    const { data: company } = await admin.from("companies")
      .select("id, slug, asaas_account_id, asaas_wallet_id, asaas_api_key_encrypted, asaas_account_status")
      .eq("id", payload.companyId).eq("slug", TARGET_COMPANY_SLUG).single();
    if (!company) return { error: "A empresa alvo não foi encontrada. Nenhum dado foi salvo." };

    const next = {
      asaas_api_key_encrypted: encryptSecret(payload.apiKey),
      asaas_account_id: validated.identity.accountId || null,
      asaas_wallet_id: validated.identity.walletId || null,
      asaas_account_status: validated.status,
      asaas_connected_at: new Date().toISOString(),
    };
    const beforeState = {
      asaas_api_key_encrypted: company.asaas_api_key_encrypted ? "[REDACTED]" : null,
      asaas_account_id: company.asaas_account_id,
      asaas_wallet_id: company.asaas_wallet_id,
      asaas_account_status: company.asaas_account_status,
    };
    const afterState = {
      asaas_api_key_encrypted: "[REDACTED]",
      asaas_account_id: next.asaas_account_id,
      asaas_wallet_id: next.asaas_wallet_id,
      asaas_account_status: next.asaas_account_status,
      environment: payload.environment,
      asaas_status_response: validated.rawStatus,
    };

    const { error: auditError } = await admin.from("admin_audit_logs").insert({
      actor_user_id: user.id,
      actor_email: user.email ?? "",
      company_id: company.id,
      action: "asaas_company_credential_reconnection_approved",
      target_type: "company",
      target_id: company.id,
      before_state: beforeState,
      after_state: afterState,
    });
    if (auditError) return { error: "A auditoria não pôde ser criada; por segurança, a empresa não foi alterada." };

    const { data: updated, error: updateError } = await admin.from("companies")
      .update(next).eq("id", company.id).eq("slug", TARGET_COMPANY_SLUG)
      .eq("asaas_api_key_encrypted", company.asaas_api_key_encrypted)
      .select("id").maybeSingle();
    if (updateError || !updated) return { error: "A auditoria registrou a tentativa, mas a empresa não foi alterada. Valide o estado atual antes de tentar novamente." };

    revalidatePath("/painel/admin/empresas");
    revalidatePath("/painel/financeiro");
    return { success: "Reconexão persistida. Novos checkouts usarão a credencial validada do Studio BeautyFlow." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "A reconexão não foi persistida." };
  }
}
