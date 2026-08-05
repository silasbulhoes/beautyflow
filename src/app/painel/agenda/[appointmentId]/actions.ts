"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppointmentActionState = {
  error?: string;
};

type AsaasRefund = {
  status?: string;
};

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

function hasRefundWithStatus(
  refunds: AsaasRefund[],
  statuses: string[],
) {
  return refunds.some((refund) =>
    statuses.includes(
      String(refund.status ?? "").toUpperCase(),
    ),
  );
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
        asaas_payment_id
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

  const paymentWasReceived =
    appointment.payment_status === "received" ||
    appointment.payment_status === "confirmed" ||
    appointment.payment_status === "refunded";

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

      if (hasRefundWithStatus(refunds, ["PENDING"])) {
        return {
          error:
            "O estorno desta cobrança já está em processamento no Asaas. O agendamento ainda não foi marcado como cancelado; confira o financeiro antes de tentar novamente.",
        };
      }

      refundWasCompleted =
        payment.status?.toUpperCase() === "REFUNDED" ||
        hasRefundWithStatus(refunds, ["DONE"]);

      if (!refundWasCompleted) {
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
        refundWasCompleted =
          refundResult.status?.toUpperCase() ===
            "REFUNDED" ||
          hasRefundWithStatus(refunds, ["DONE"]);

        if (!refundWasCompleted) {
          return {
            error:
              "O Asaas recebeu o pedido de estorno, mas ainda não confirmou a devolução. O agendamento não foi cancelado; confira o financeiro antes de tentar novamente.",
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

    if (checkoutId) {
      try {
        const credentials =
          await getCompanyAsaasCredentials(
            profile.company_id,
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

  const nextPaymentStatus = refundWasCompleted
    ? "refunded"
    : appointment.payment_status;

  let updateQuery = adminSupabase
    .from("appointments")
    .update({
      status: "cancelled",
      payment_status: nextPaymentStatus,
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
