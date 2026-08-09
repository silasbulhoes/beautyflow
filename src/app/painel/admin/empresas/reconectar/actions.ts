"use server";

import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-access";
import { asaasRequest } from "@/lib/asaas/request";
import { getProfessionalAsaasRuntime, parseAsaasEnvironment } from "@/lib/asaas/environment";
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
    const runtime = getProfessionalAsaasRuntime();
    const requestedEnvironment = parseAsaasEnvironment(read(formData, "environment"));
    const apiKey = read(formData, "apiKey");
    if (requestedEnvironment !== runtime.environment) return { error: "Use o deployment configurado para o ambiente selecionado." };
    if (!apiKey) return { error: "Informe a nova chave de API." };

    const validated = await validateCredential(runtime.apiUrl, apiKey);
    const admin = createAdminClient();
    const { data: company, error } = await admin.from("companies")
      .select("id, slug")
      .eq("slug", TARGET_COMPANY_SLUG).single();
    if (error || !company) return { error: "A empresa studio-beautyflow não foi encontrada." };

    const { data: connection } = await admin.from("company_asaas_connections")
      .select("api_key_encrypted, account_id, wallet_id, account_status")
      .eq("company_id", company.id).eq("environment", runtime.environment).maybeSingle();
    let currentKey = "";
    try {
      currentKey = connection?.api_key_encrypted ? decryptSecret(connection.api_key_encrypted) : "";
    } catch { currentKey = ""; }

    const environment = runtime.environment;
    const preview: ReconnectPreview = {
      companyId: company.id,
      companySlug: company.slug,
      environment,
      identity: validated.identity,
      current: {
        apiKey: mask(currentKey),
        accountId: mask(connection?.account_id),
        walletId: mask(connection?.wallet_id),
        status: connection?.account_status ?? "(vazio)",
      },
      next: {
        apiKey: mask(apiKey),
        accountId: validated.identity.accountId ? mask(validated.identity.accountId) : "NULL",
        walletId: validated.identity.walletId ? mask(validated.identity.walletId) : "NULL",
        status: validated.status,
      },
      updateStatement: `INSERT INTO public.company_asaas_connections (company_id, environment, api_key_encrypted, account_id, wallet_id, account_status, connected_at) VALUES ('${company.id}', '${environment}', '[CRIPTOGRAFADA]', ${validated.identity.accountId ? "'[ID VALIDADO]'" : "NULL"}, ${validated.identity.walletId ? "'[WALLET VALIDADO]'" : "NULL"}, '${validated.status}', now()) ON CONFLICT (company_id, environment) DO UPDATE SET api_key_encrypted = EXCLUDED.api_key_encrypted, account_id = EXCLUDED.account_id, wallet_id = EXCLUDED.wallet_id, account_status = EXCLUDED.account_status, connected_at = EXCLUDED.connected_at, updated_at = now();`,
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
    const runtime = getProfessionalAsaasRuntime();
    if (payload.environment !== runtime.environment) {
      return { error: "O ambiente Asaas mudou desde a validação. Nenhum dado foi salvo." };
    }
    const validated = await validateCredential(runtime.apiUrl, payload.apiKey);
    const admin = createAdminClient();
    const { data: company } = await admin.from("companies")
      .select("id, slug")
      .eq("id", payload.companyId).eq("slug", TARGET_COMPANY_SLUG).single();
    if (!company) return { error: "A empresa alvo não foi encontrada. Nenhum dado foi salvo." };

    const { data: currentConnection } = await admin.from("company_asaas_connections")
      .select("api_key_encrypted, account_id, wallet_id, account_status")
      .eq("company_id", company.id).eq("environment", payload.environment).maybeSingle();
    const next = {
      company_id: company.id,
      environment: payload.environment,
      api_key_encrypted: encryptSecret(payload.apiKey),
      account_id: validated.identity.accountId || null,
      wallet_id: validated.identity.walletId || null,
      account_status: validated.status,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const beforeState = {
      api_key_encrypted: currentConnection?.api_key_encrypted ? "[REDACTED]" : null,
      account_id: currentConnection?.account_id ?? null,
      wallet_id: currentConnection?.wallet_id ?? null,
      account_status: currentConnection?.account_status ?? null,
      environment: payload.environment,
    };
    const afterState = {
      api_key_encrypted: "[REDACTED]",
      account_id: next.account_id,
      wallet_id: next.wallet_id,
      account_status: next.account_status,
      environment: payload.environment,
      asaas_status_response: validated.rawStatus,
    };

    const { error: auditError } = await admin.from("admin_audit_logs").insert({
      actor_user_id: user.id,
      actor_email: user.email ?? "",
      company_id: company.id,
      action: "asaas_company_credential_reconnection_approved",
      target_type: "company_asaas_connection",
      target_id: `${company.id}:${payload.environment}`,
      before_state: beforeState,
      after_state: afterState,
    });
    if (auditError) return { error: "A auditoria não pôde ser criada; por segurança, a empresa não foi alterada." };

    const { data: updated, error: updateError } = await admin.from("company_asaas_connections")
      .upsert(next, { onConflict: "company_id,environment" })
      .select("id").maybeSingle();
    if (updateError || !updated) return { error: "A auditoria registrou a tentativa, mas a empresa não foi alterada. Valide o estado atual antes de tentar novamente." };

    revalidatePath("/painel/admin/empresas");
    revalidatePath("/painel/financeiro");
    return { success: "Reconexão persistida. Novos checkouts usarão a credencial validada do Studio BeautyFlow." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "A reconexão não foi persistida." };
  }
}
