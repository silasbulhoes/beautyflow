"use server";

import { revalidatePath } from "next/cache";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import { createAdminClient } from "@/lib/supabase/admin";

export type SandboxPaymentState = {
  error?: string;
  success?: string;
};

type AsaasPayment = {
  id?: string;
  status?: string;
  billingType?: string;
  checkoutSession?: string;
};

type AsaasPaymentListResponse = {
  data?: AsaasPayment[];
};

function readFormValue(
  formData: FormData,
  field: string,
) {
  return String(formData.get(field) ?? "").trim();
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function simularPagamentoSandbox(
  _previousState: SandboxPaymentState,
  formData: FormData,
): Promise<SandboxPaymentState> {
  void _previousState;

  const appointmentId = readFormValue(
    formData,
    "appointmentId",
  );

  const slug = readFormValue(formData, "slug");

  if (!appointmentId || !slug) {
    return {
      error:
        "Não foi possível identificar o agendamento.",
    };
  }

  const supabase = createAdminClient();

  const { data: company, error: companyError } =
    await supabase
      .from("companies")
      .select("id, slug")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

  if (companyError) {
    console.error(
      "Erro ao consultar empresa no teste Sandbox:",
      companyError,
    );

    return {
      error: "Não foi possível consultar a empresa.",
    };
  }

  if (!company) {
    return {
      error: "Empresa não encontrada.",
    };
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await supabase
    .from("appointments")
    .select(`
      id,
      company_id,
      status,
      payment_status,
      asaas_checkout_id,
      asaas_payment_id
    `)
    .eq("id", appointmentId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (appointmentError) {
    console.error(
      "Erro ao consultar agendamento no teste Sandbox:",
      appointmentError,
    );

    return {
      error:
        "Não foi possível consultar o agendamento.",
    };
  }

  if (!appointment) {
    return {
      error: "Agendamento não encontrado.",
    };
  }

  if (
    appointment.status === "confirmed" ||
    appointment.payment_status === "received" ||
    appointment.payment_status === "confirmed"
  ) {
    return {
      success:
        "Este pagamento já está confirmado.",
    };
  }

  if (!appointment.asaas_checkout_id) {
    return {
      error:
        "Primeiro abra o checkout do Asaas e gere a cobrança Pix.",
    };
  }

  let credentials: Awaited<
    ReturnType<typeof getCompanyAsaasCredentials>
  >;

  try {
    credentials =
      await getCompanyAsaasCredentials(company.id, "sandbox");
  } catch (error) {
    console.error(
      "Erro ao acessar credenciais no teste Sandbox:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        "Não foi possível acessar a conta financeira.",
    };
  }

  const isSandbox = credentials.environment === "sandbox";

  if (!isSandbox) {
    return {
      error:
        "A simulação de pagamento é permitida somente no Asaas Sandbox.",
    };
  }

  let paymentId = appointment.asaas_payment_id;

  if (!paymentId) {
    const query = new URLSearchParams({
      checkoutSession:
        appointment.asaas_checkout_id,
      limit: "10",
    });

    let paymentsResult: AsaasPaymentListResponse;

    try {
      paymentsResult =
        await asaasRequest<AsaasPaymentListResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: `/payments?${query.toString()}`,
          method: "GET",
        });
    } catch (error) {
      console.error(
        "Erro ao procurar cobrança do checkout:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );

      return {
        error:
          "Não foi possível localizar a cobrança criada pelo checkout.",
      };
    }

    const payments = Array.isArray(
      paymentsResult.data,
    )
      ? paymentsResult.data
      : [];

    const pixPayment = payments.find(
      (item) =>
        item.billingType?.toUpperCase() === "PIX",
    );

    const payment =
      pixPayment ??
      payments.find((item) => Boolean(item.id));

    paymentId = payment?.id ?? null;
  }

  if (!paymentId) {
    return {
      error:
        "A cobrança ainda não foi gerada. Abra o checkout, escolha Pix, gere o QR Code e volte para esta página.",
    };
  }

  try {
    await asaasRequest<Record<string, unknown>>({
      apiUrl: credentials.apiUrl,
      apiKey: credentials.apiKey,
      path: `/sandbox/payment/${paymentId}/confirm`,
      method: "POST",
    });
  } catch (error) {
    console.error(
      "Erro ao confirmar pagamento no Sandbox:",
      {
        appointmentId: appointment.id,
        paymentId,
        usingSubaccount:
          credentials.usingSubaccount,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",
      },
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : "O Asaas não conseguiu simular o pagamento.",
    };
  }

  /*
   * Salvamos somente o ID da cobrança.
   *
   * Não alteramos status, payment_status nem paid_at.
   * Esses campos devem ser atualizados pelo webhook.
   */
  const { error: paymentIdUpdateError } =
    await supabase
      .from("appointments")
      .update({
        asaas_payment_id: paymentId,
      })
      .eq("id", appointment.id)
      .eq("company_id", company.id);

  if (paymentIdUpdateError) {
    console.error(
      "Pagamento simulado, mas não foi possível salvar o paymentId:",
      paymentIdUpdateError,
    );
  }

  console.info(
    "Pagamento simulado no Asaas Sandbox. Aguardando webhook:",
    {
      appointmentId: appointment.id,
      paymentId,
      usingSubaccount:
        credentials.usingSubaccount,
    },
  );

  /*
   * Aguarda alguns segundos para o webhook chegar à Vercel
   * e atualizar o agendamento no Supabase.
   */
  let webhookConfirmed = false;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await wait(1000);

    const {
      data: updatedAppointment,
      error: refreshError,
    } = await supabase
      .from("appointments")
      .select("status, payment_status")
      .eq("id", appointment.id)
      .eq("company_id", company.id)
      .maybeSingle();

    if (refreshError) {
      console.error(
        "Erro ao verificar confirmação do webhook:",
        refreshError,
      );

      break;
    }

    if (
      updatedAppointment?.status === "confirmed" ||
      updatedAppointment?.payment_status === "received" ||
      updatedAppointment?.payment_status === "confirmed"
    ) {
      webhookConfirmed = true;
      break;
    }
  }

  revalidatePath(
    `/agendar/${slug}/pagamento/${appointment.id}`,
  );

  revalidatePath("/painel/agenda");

  revalidatePath(
    `/painel/agenda/${appointment.id}`,
  );

  if (webhookConfirmed) {
    return {
      success:
        "Pagamento simulado e confirmado automaticamente pelo webhook.",
    };
  }

  return {
    success:
      "Pagamento simulado no Asaas. A confirmação automática ainda está sendo processada. Atualize a página em alguns segundos.",
  };
}
