import "server-only";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPOINTMENT_PAYMENT_STATUS, APPOINTMENT_STATUS } from "./status";

type PaymentList = { data?: Array<{ id?: string; status?: string; externalReference?: string | null; checkoutSession?: string | null }> };
export type ReconciliationSummary = { checked: number; confirmed: number; expired: number; inconsistent: number; failed: number };

export async function reconcilePendingPayments(companyId?: string): Promise<ReconciliationSummary> {
  const supabase = createAdminClient();
  const summary: ReconciliationSummary = { checked: 0, confirmed: 0, expired: 0, inconsistent: 0, failed: 0 };
  let query = supabase.from("appointments").select("id, company_id, expires_at, asaas_checkout_id, asaas_payment_id").eq("status", APPOINTMENT_STATUS.PENDING_PAYMENT).limit(100);
  if (companyId) query = query.eq("company_id", companyId);
  const { data: appointments, error } = await query;
  if (error) throw new Error(`Falha ao listar pagamentos pendentes: ${error.message}`);

  for (const appointment of appointments ?? []) {
    summary.checked += 1;
    try {
      if (appointment.expires_at && appointment.expires_at <= new Date().toISOString()) {
        const { error: expireError } = await supabase.from("appointments").update({ status: APPOINTMENT_STATUS.EXPIRED, payment_status: APPOINTMENT_PAYMENT_STATUS.EXPIRED }).eq("id", appointment.id).eq("company_id", appointment.company_id).eq("status", APPOINTMENT_STATUS.PENDING_PAYMENT);
        if (expireError) throw expireError;
        summary.expired += 1;
        continue;
      }
      if (!appointment.asaas_checkout_id) {
        summary.inconsistent += 1;
        continue;
      }

      const credentials = await getCompanyAsaasCredentials(appointment.company_id);
      const params = new URLSearchParams({ checkoutSession: appointment.asaas_checkout_id, limit: "20" });
      const result = await asaasRequest<PaymentList>({ apiUrl: credentials.apiUrl, apiKey: credentials.apiKey, path: `/payments?${params.toString()}` });
      const candidates = (result.data ?? []).filter((payment) => payment.id && payment.checkoutSession === appointment.asaas_checkout_id && (!payment.externalReference || payment.externalReference === appointment.id));
      if (candidates.length !== 1) {
        summary.inconsistent += 1;
        continue;
      }
      const payment = candidates[0];
      if (String(payment.status).toUpperCase() !== "RECEIVED") continue;
      const { data: updated, error: updateError } = await supabase.from("appointments").update({ status: APPOINTMENT_STATUS.CONFIRMED, payment_status: APPOINTMENT_PAYMENT_STATUS.RECEIVED, asaas_payment_id: payment.id, paid_at: new Date().toISOString() }).eq("id", appointment.id).eq("company_id", appointment.company_id).eq("status", APPOINTMENT_STATUS.PENDING_PAYMENT).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (updated) summary.confirmed += 1;
    } catch (reconciliationError) {
      summary.failed += 1;
      console.error("Falha na reconciliação de pagamento:", { appointmentId: appointment.id, companyId: appointment.company_id, error: reconciliationError instanceof Error ? reconciliationError.message : "Erro desconhecido" });
    }
  }
  return summary;
}
