"use server";

import { redirect } from "next/navigation";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import {
  expirePendingAppointmentIfDue,
  isPendingPaymentExpired,
} from "@/lib/appointments/expire-pending-appointment";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateCheckoutState = {
  error?: string;
};

type AsaasCheckoutResponse = {
  id?: string;
  link?: string;
  status?: string;
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

function getCheckoutFallbackUrl(
  apiUrl: string,
  checkoutId: string,
) {
  const isSandbox = apiUrl.includes("api-sandbox");

  const checkoutDomain = isSandbox
    ? "https://sandbox.asaas.com"
    : "https://www.asaas.com";

  return `${checkoutDomain}/checkoutSession/show/${checkoutId}`;
}

export async function createAsaasCheckout(
  _previousState: CreateCheckoutState,
  formData: FormData,
): Promise<CreateCheckoutState> {
  void _previousState;

  const appointmentId = String(
    formData.get("appointmentId") ?? "",
  ).trim();

  const slug = String(
    formData.get("slug") ?? "",
  ).trim();

  if (!appointmentId || !slug) {
    return {
      error: "Não foi possível identificar o agendamento.",
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
      "Erro ao consultar empresa do agendamento:",
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

  const { data: appointment, error: appointmentError } =
    await supabase
      .from("appointments")
      .select(`
        id,
        company_id,
        status,
        payment_status,
        deposit_amount_cents,
        expires_at,
        asaas_checkout_id,
        asaas_checkout_url,
        services (
          name,
          description
        )
      `)
      .eq("id", appointmentId)
      .eq("company_id", company.id)
      .maybeSingle();

  if (appointmentError) {
    console.error(
      "Erro ao consultar agendamento:",
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

  if (
    appointment.status === "confirmed" ||
    appointment.payment_status === "received"
  ) {
    return {
      error: "Este agendamento já foi confirmado.",
    };
  }

  if (
    appointment.status === "canceled" ||
    appointment.status === "expired" ||
    appointment.payment_status === "expired"
  ) {
    return {
      error:
        "Este agendamento não está mais disponível para pagamento.",
    };
  }

  const wasExpired =
    await expirePendingAppointmentIfDue(supabase, {
      id: appointment.id,
      status: appointment.status,
      expires_at: appointment.expires_at,
    });

  if (
    wasExpired ||
    isPendingPaymentExpired({
      id: appointment.id,
      status: appointment.status,
      expires_at: appointment.expires_at,
    })
  ) {
    return {
      error:
        "O prazo para pagamento desta reserva expirou. Volte e escolha outro horário.",
    };
  }

  if (
    appointment.asaas_checkout_id &&
    appointment.asaas_checkout_url
  ) {
    redirect(appointment.asaas_checkout_url);
  }

  let asaasCredentials: Awaited<
    ReturnType<typeof getCompanyAsaasCredentials>
  >;

  try {
    asaasCredentials =
      await getCompanyAsaasCredentials(company.id);
  } catch (error) {
    console.error(
      "Erro ao carregar credenciais financeiras:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido",
    );

    return {
      error:
        "Não foi possível acessar a conta financeira da profissional.",
    };
  }

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

  const depositValue =
    appointment.deposit_amount_cents / 100;

  if (
    !Number.isFinite(depositValue) ||
    depositValue <= 0
  ) {
    redirect(
      `/agendar/${slug}/confirmado/${appointmentId}`,
    );
  }

  const baseUrl = getBaseUrl().replace(/\/$/, "");

  const payload = {
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED"],
    minutesToExpire: 30,
    externalReference: appointment.id,

    callback: {
      successUrl:
        `${baseUrl}/agendar/${slug}/pagamento/` +
        `${appointment.id}?resultado=sucesso`,

      cancelUrl:
        `${baseUrl}/agendar/${slug}/pagamento/` +
        `${appointment.id}?resultado=cancelado`,

      expiredUrl:
        `${baseUrl}/agendar/${slug}/pagamento/` +
        `${appointment.id}?resultado=expirado`,
    },

    items: [
      {
        externalReference: appointment.id,
        name: `Sinal - ${service?.name ?? "Serviço"}`,
        description:
          service?.description ??
          "Pagamento do sinal do agendamento",
        quantity: 1,
        value: depositValue,
      },
    ],
  };

  let result: AsaasCheckoutResponse;

  try {
    result =
      await asaasRequest<AsaasCheckoutResponse>({
        apiUrl: asaasCredentials.apiUrl,
        apiKey: asaasCredentials.apiKey,
        path: "/checkouts",
        method: "POST",
        body: payload,
      });
  } catch (error) {
    console.error(
      "Erro ao criar checkout Asaas:",
      {
        companyId: company.id,
        appointmentId: appointment.id,
        usingSubaccount:
          asaasCredentials.usingSubaccount,
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
          : "O Asaas não conseguiu criar o checkout.",
    };
  }

  if (!result.id) {
    console.error(
      "Checkout criado sem identificador:",
      {
        companyId: company.id,
        appointmentId: appointment.id,
        usingSubaccount:
          asaasCredentials.usingSubaccount,
      },
    );

    return {
      error:
        "O Asaas retornou um checkout sem identificação.",
    };
  }

  const checkoutUrl =
    result.link ??
    getCheckoutFallbackUrl(
      asaasCredentials.apiUrl,
      result.id,
    );

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      asaas_checkout_id: result.id,
      asaas_checkout_url: checkoutUrl,
      payment_provider: "asaas",
      payment_status: "pending",
    })
    .eq("id", appointment.id)
    .eq("company_id", company.id);

  if (updateError) {
    console.error(
      "Erro ao salvar checkout no Supabase:",
      updateError,
    );

    return {
      error:
        "O checkout foi criado, mas não foi possível salvá-lo.",
    };
  }

  console.info("Checkout Asaas criado:", {
    appointmentId: appointment.id,
    companyId: company.id,
    usingSubaccount:
      asaasCredentials.usingSubaccount,
    asaasAccountId:
      asaasCredentials.accountId,
  });

  redirect(checkoutUrl);
}