"use server";

import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-access";
import { reconcilePendingPayments } from "@/lib/appointments/reconcile-payments";
import { validateExemptionAccess, validateGrantInput, validateRevokeInput } from "@/lib/billing/exemptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminReconciliationState = {
  error?: string;
  success?: string;
};

export async function reconciliarPagamentosPendentesAdmin(
  _previousState: AdminReconciliationState,
  _formData: FormData,
): Promise<AdminReconciliationState> {
  void _previousState;
  void _formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return { error: "Não autorizado." };
  }

  const assurance =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    assurance.error ||
    assurance.data.currentLevel !== "aal2"
  ) {
    return {
      error: "Confirme o segundo fator antes da reconciliação.",
    };
  }

  try {
    const summary = await reconcilePendingPayments();
    revalidatePath("/painel/admin/empresas");
    revalidatePath("/painel/agenda");
    revalidatePath("/painel/financeiro");

    return {
      success: `Reconciliação concluída: ${summary.checked} verificados, ${summary.confirmed} confirmados, ${summary.expired} expirados, ${summary.inconsistent} inconsistentes e ${summary.failed} falhas.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível executar a reconciliação.",
    };
  }
}

export type ExemptionActionState = { error?: string; success?: string };

async function getExemptionContext(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const admin = createAdminClient();
  const [{ count: companyCount, error: companyError }, { count: subscriptionCount, error: subscriptionError }] = await Promise.all([
    admin.from("companies").select("id", { count: "exact", head: true }).eq("id", companyId),
    admin.from("company_subscriptions").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);
  if (companyError || subscriptionError) throw new Error("Não foi possível validar a empresa.");
  validateExemptionAccess({ isAdmin: Boolean(user && isAdminEmail(user.email)), assuranceLevel: aal.error ? null : aal.data.currentLevel, companyCount: companyCount ?? 0, subscriptionCount: subscriptionCount ?? 0 });
  if (!user) throw new Error("Não autorizado.");
  return { admin, user };
}

export async function concederIsencao(_state: ExemptionActionState, formData: FormData): Promise<ExemptionActionState> {
  try {
    const companyId = String(formData.get("companyId") ?? "");
    const planCode = String(formData.get("planCode") ?? "");
    const { admin, user } = await getExemptionContext(companyId);
    const { count, error: planError } = await admin.from("billing_plans").select("id", { count: "exact", head: true }).eq("code", planCode).eq("active", true);
    if (planError) throw new Error("Não foi possível validar o plano.");
    const input = validateGrantInput({ planCode, activePlanCount: count ?? 0, reason: String(formData.get("reason") ?? ""), endsAt: String(formData.get("endsAt") ?? ""), confirmation: String(formData.get("confirmation") ?? "") });
    const { error } = await admin.rpc("grant_company_billing_exemption", { p_company_id: companyId, p_plan_code: input.planCode, p_reason: input.reason, p_ends_at: input.endsAt, p_actor_user_id: user.id, p_actor_email: user.email ?? "" });
    if (error) throw new Error(`A isenção não foi gravada: ${error.message}`);
    revalidatePath("/painel/admin/empresas");
    return { success: "Isenção concedida com segurança." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível conceder a isenção." };
  }
}

export async function removerIsencao(_state: ExemptionActionState, formData: FormData): Promise<ExemptionActionState> {
  try {
    const companyId = String(formData.get("companyId") ?? "");
    const { admin, user } = await getExemptionContext(companyId);
    const input = validateRevokeInput({ reason: String(formData.get("reason") ?? ""), confirmation: String(formData.get("confirmation") ?? "") });
    const { error } = await admin.rpc("revoke_company_billing_exemption", { p_company_id: companyId, p_reason: input.reason, p_actor_user_id: user.id, p_actor_email: user.email ?? "" });
    if (error) throw new Error(`A isenção não foi removida: ${error.message}`);
    revalidatePath("/painel/admin/empresas");
    return { success: "Isenção removida. A cobrança continua desativada e aguarda ativação explícita." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível remover a isenção." };
  }
}
