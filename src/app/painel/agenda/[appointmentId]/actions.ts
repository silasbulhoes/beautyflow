"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import {
  AsaasRefund,
  getRefundDecision,
} from "@/lib/asaas/refunds";
import { asaasRequest } from "@/lib/asaas/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCancellationExternalOperation, getCancelledAppointmentState } from "@/lib/appointments/no-deposit-flow";

export type AppointmentActionState = {
  error?: string;
  success?: string;
};

export async function registrarReembolsoManual(
  appointmentId: string,
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  void _previousState;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { error: "Não foi possível identificar sua empresa." };
  }

  const confirmation = String(
    formData.get("confirmation") ?? "",
  ).trim();
  const observation = String(
    formData.get("observation") ?? "",
  ).trim();
  const receiptUrl = String(
    formData.get("receiptUrl") ?? "",
  ).trim();

  if (confirmation !== "CONFIRMAR REEMBOLSO MANUAL") {
    return { error: "A confirmação explícita não confere." };
  }

  if (observation.length < 10 || observation.length > 1000) {
    return {
      error: "Informe uma observação entre 10 e 1000 caracteres.",
    };
  }

  if (receiptUrl) {
    try {
      const url = new URL(receiptUrl);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      return { error: "O comprovante deve usar uma URL HTTPS válida." };
    }
  }

  const admin = createAdminClient();
  const { data: appointment, error } = await admin
    .from("appointments")
    .select("id, company_id, status, payment_status, deposit_amount_cents, asaas_payment_id, asaas_environment")
    .eq("id", appointmentId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !appointment) {
    return { error: "Agendamento não encontrado nesta empresa." };
  }

  if (
    appointment.status !== "confirmed" ||
    appointment.payment_status !== "received"
  ) {
    return {
      error: "Este agendamento não está elegível para reembolso manual.",
    };
  }

  const idempotencyKey = `manual:${appointment.id}:${appointment.asaas_payment_id ?? "received"}`;
  const { error: rpcError } = await admin.rpc(
    "confirm_manual_appointment_refund",
    {
      p_appointment_id: appointment.id,
      p_company_id: appointment.company_id,
      p_amount_cents: appointment.deposit_amount_cents,
      p_observation: observation,
      p_receipt_url: receiptUrl || null,
      p_actor_user_id: user.id,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (rpcError) {
    console.error("Falha ao registrar reembolso manual:", {
      code: rpcError.code,
      message: rpcError.message,
      appointmentId: appointment.id,
      companyId: appointment.company_id,
    });
    return {
      error:
        rpcError.code === "PGRST202"
          ? "A estrutura de reembolso manual ainda não foi aplicada no banco."
          : "Não foi possível registrar o reembolso manual. Nenhum estado foi alterado.",
    };
  }

  revalidatePath(`/painel/agenda/${appointment.id}`);
  revalidatePath("/painel/agenda");
  revalidatePath("/painel/financeiro");

  return {
    success:
      "Reembolso manual registrado e atendimento cancelado. O pagamento recebido foi preservado no histórico.",
  };
}

type AsaasPayment = {
  id?: string;
  status?: string;
  externalReference?: string | null;
  checkoutSession?: string | null;
  refunds?: AsaasRefund[];
};

type AsaasRefundsResponse =
  | AsaasRefund[]
  | { data?: AsaasRefund[] };

function getRefunds(response: AsaasRefundsResponse) {
  return Array.isArray(response)
    ? response
    : Array.isArray(response.data)
      ? response.data
      : [];
}

export async function cancelarAgendamento(
  appointmentId: string,
  _previousState: AppointmentActionState,
  _formData: FormData,
): Promise<AppointmentActionState> {
  void _previousState;
  void _formData;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return {
      error: "Não foi possível identificar sua empresa.",
    };
  }

  const adminSupabase = createAdminClient();

  const { data: appointment, error: appointmentError } =
    await adminSupabase
      .from("appointments")
      .select(`
        id,
        company_id,
        appointment_date,
        status,
        payment_status,
        deposit_amount_cents,
        asaas_checkout_id,
        asaas_payment_id,
        asaas_environment
      `)
      .eq("id", appointmentId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

  if (appointmentError) {
    console.error(
      "Erro ao consultar agendamento para cancelamento:",
      appointmentError,
    );

    return {
      error: "Não foi possível consultar o agendamento.",
    };
  }

  if (!appointment) {
    return {
      error: "Agendamento não encontrado.",
    };
  }

  if (appointment.status === "cancelled") {
    return {
      error: "Este agendamento já está cancelado.",
    };
  }

  if (appointment.status === "expired") {
    return {
      error: "Este agendamento já expirou.",
    };
  }

  const externalOperation = getCancellationExternalOperation(appointment.payment_status, appointment.asaas_checkout_id);
  const paymentWasReceived = externalOperation.requiresRefund;

  let refundWasCompleted = false;

  /*
   * Se o sinal foi pago, precisamos estornar antes de
   * cancelar o agendamento no banco.
   */
  if (paymentWasReceived) {
    const paymentId = String(
      appointment.asaas_payment_id ?? "",
    ).trim();

    if (!paymentId) {
      return {
        error:
          "O pagamento foi recebido, mas o identificador da cobrança no Asaas não foi encontrado. Não cancele novamente. Verifique o financeiro.",
      };
    }

    try {
      const credentials =
        await getCompanyAsaasCredentials(
          profile.company_id,
          appointment.asaas_environment,
        );

      const payment = await asaasRequest<AsaasPayment>({
        apiUrl: credentials.apiUrl,
        apiKey: credentials.apiKey,
        path: `/payments/${encodeURIComponent(paymentId)}`,
      });

      if (payment.id !== paymentId) {
        throw new Error(
          "A cobrança retornada pelo Asaas não corresponde ao pagamento do agendamento.",
        );
      }

      const belongsToAppointment =
        payment.externalReference === appointment.id ||
        (Boolean(appointment.asaas_checkout_id) &&
          payment.checkoutSession ===
            appointment.asaas_checkout_id);

      if (!belongsToAppointment) {
        throw new Error(
          "A cobrança localizada no Asaas não pertence a este agendamento.",
        );
      }

      const refundsResponse =
        await asaasRequest<AsaasRefundsResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: `/payments/${encodeURIComponent(
            paymentId,
          )}/refunds`,
        });

      let refunds = getRefunds(refundsResponse);

      let refundDecision = getRefundDecision(
        payment.status,
        refunds,
      );

      if (refundDecision.state === "awaiting_authorization") {
        return {
          error:
            "O estorno aguarda autorização de ação crítica no Asaas. O atendimento continua confirmado; autorize e consulte novamente, sem repetir o pedido.",
        };
      }

      if (refundDecision.state === "processing") {
        return {
          error:
            "O estorno desta cobrança já está em processamento no Asaas. O agendamento ainda não foi marcado como cancelado; confira o financeiro antes de tentar novamente.",
        };
      }

      if (refundDecision.state === "cancelled") {
        return {
          error:
            "O Asaas cancelou a tentativa de estorno e não devolveu o valor. O atendimento continua confirmado. Procure o suporte do Asaas ou registre um reembolso manual; não repita o pedido automaticamente.",
        };
      }

      refundWasCompleted = refundDecision.completed;

      if (refundDecision.mayRequestAutomatically) {
        const refundResult =
          await asaasRequest<AsaasPayment>({
            apiUrl: credentials.apiUrl,
            apiKey: credentials.apiKey,
            path: `/payments/${encodeURIComponent(
              paymentId,
            )}/refund`,
            method: "POST",
            body: {
              value:
                appointment.deposit_amount_cents / 100,
              description:
                "Cancelamento do agendamento no BeautyFlow",
            },
          });

        refunds = Array.isArray(refundResult.refunds)
          ? refundResult.refunds
          : [];
        refundDecision = getRefundDecision(
          refundResult.status,
          refunds,
        );
        refundWasCompleted = refundDecision.completed;

        if (!refundWasCompleted) {
          const message =
            refundDecision.state === "awaiting_authorization"
              ? "O estorno foi solicitado e aguarda autorização de ação crítica no Asaas. O atendimento continua confirmado; autorize e depois consulte novamente, sem repetir o pedido."
              : refundDecision.state === "cancelled"
                ? "O Asaas cancelou o estorno e não devolveu o valor. O atendimento continua confirmado; procure o suporte ou registre um reembolso manual."
                : "O Asaas recebeu o pedido de estorno, mas ainda não confirmou a devolução. O agendamento não foi cancelado; confira o financeiro antes de tentar novamente.";
          return {
            error: message,
          };
        }
      }
    } catch (error) {
      console.error(
        "Erro ao estornar pagamento no Asaas:",
        {
          appointmentId: appointment.id,
          paymentId,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido",
        },
      );

      return {
        error:
          error instanceof Error
            ? `O agendamento não foi cancelado porque o estorno falhou: ${error.message}`
            : "O agendamento não foi cancelado porque o estorno falhou.",
      };
    }
  } else {
    /*
     * Se o sinal ainda não foi pago, cancela o checkout
     * para impedir que a cliente pague depois do
     * cancelamento do atendimento.
     */
    const checkoutId = String(
      appointment.asaas_checkout_id ?? "",
    ).trim();

    if (externalOperation.shouldCancelCheckout && checkoutId) {
      try {
        const credentials =
          await getCompanyAsaasCredentials(
            profile.company_id,
            appointment.asaas_environment,
          );

        await asaasRequest<Record<string, unknown>>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: `/checkouts/${encodeURIComponent(
            checkoutId,
          )}/cancel`,
          method: "POST",
        });
      } catch (error) {
        console.error(
          "Erro ao cancelar checkout no Asaas:",
          {
            appointmentId: appointment.id,
            checkoutId,
            error:
              error instanceof Error
                ? error.message
                : "Erro desconhecido",
          },
        );

        return {
          error:
            error instanceof Error
              ? `O agendamento não foi cancelado porque o checkout não pôde ser encerrado: ${error.message}`
              : "O agendamento não foi cancelado porque o checkout não pôde ser encerrado.",
        };
      }
    }
  }

  const cancelledState = getCancelledAppointmentState(appointment.payment_status, refundWasCompleted);

  let updateQuery = adminSupabase
    .from("appointments")
    .update({
      ...cancelledState,
    })
    .eq("id", appointment.id)
    .eq("company_id", profile.company_id)
    .eq("status", appointment.status);

  updateQuery = appointment.payment_status === null
    ? updateQuery.is("payment_status", null)
    : updateQuery.eq(
        "payment_status",
        appointment.payment_status,
      );

  const { data: updatedAppointment, error: updateError } =
    await updateQuery
    .select("id")
    .maybeSingle();

  if (updateError || !updatedAppointment) {
    console.error(
      "Erro ao atualizar agendamento após cancelamento:",
      {
        appointmentId: appointment.id,
        paymentWasReceived,
        updateError,
        updated: Boolean(updatedAppointment),
      },
    );

    return {
      error: paymentWasReceived
        ? "O estorno foi solicitado ao Asaas, mas o sistema não conseguiu atualizar o agendamento. Não tente cancelar novamente. Atualize a página e confira o financeiro."
        : appointment.asaas_checkout_id
          ? "O checkout foi cancelado no Asaas, mas o sistema não conseguiu atualizar o agendamento. Atualize a página antes de tentar novamente."
          : "Não foi possível atualizar o agendamento. Atualize a página e tente novamente.",
    };
  }

  revalidatePath("/painel/agenda");
  revalidatePath(
    `/painel/agenda/${appointment.id}`,
  );
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/clientes");

  redirect(
    `/painel/agenda?mes=${appointment.appointment_date.slice(
      0,
      7,
    )}&dia=${appointment.appointment_date}`,
  );
}
