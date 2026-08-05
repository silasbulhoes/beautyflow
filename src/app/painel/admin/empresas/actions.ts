"use server";

import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function alterarIsencao(companyId: string, exempt: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Não autorizado.");
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.error || aal.data.currentLevel !== "aal2") throw new Error("Confirme o segundo fator antes desta alteração.");
  const admin = createAdminClient();
  const { data: before } = await admin.from("company_subscriptions").select("id, status, billing_exempt, billing_enabled").eq("company_id", companyId).single();
  if (!before) throw new Error("Assinatura da empresa não encontrada.");
  const after = exempt ? { status: "exempt", billing_exempt: true, billing_enabled: false } : { status: "pending", billing_exempt: false, billing_enabled: false };
  const { error } = await admin.from("company_subscriptions").update(after).eq("id", before.id).eq("company_id", companyId);
  if (error) throw new Error("Não foi possível alterar a isenção.");
  await admin.from("admin_audit_logs").insert({ actor_user_id: user.id, actor_email: user.email ?? "", company_id: companyId, action: exempt ? "billing_exemption_enabled" : "billing_exemption_disabled", target_type: "company_subscription", target_id: before.id, before_state: before, after_state: { ...before, ...after } });
  revalidatePath("/painel/admin/empresas");
}
