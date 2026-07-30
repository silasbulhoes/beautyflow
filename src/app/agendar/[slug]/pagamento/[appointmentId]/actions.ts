"use server";

import { redirect } from "next/navigation";

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

export async function createAsaasCheckout(
  _previousState: CreateCheckoutState,
  formData: FormData,
): Promise<CreateCheckoutState> {
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

  const asaasApiKey = process.env.ASAAS_API_KEY;

  const asaasApiUrl =
    process.env.ASAAS_API_URL ??
    "https://api-sandbox.asaas.com/v3";

  if (!asaasApiKey) {
    return {
      error: "A chave do Asaas não foi configurada.",
    };
  }

  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!company) {
    return {
      error: "Empresa não encontrada.",
    };
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select(`
      id,
      company_id,
      status,
      deposit_amount_cents,
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

  if (!appointment) {
    return {
      error: "Agendamento não encontrado.",
    };
  }

  if (appointment.status === "confirmed") {
    return {
      error: "Este agendamento já foi confirmado.",
    };
  }

  if (
    appointment.asaas_checkout_id &&
    appointment.asaas_checkout_url
  ) {
    redirect(appointment.asaas_checkout_url);
  }

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

  const depositValue =
    appointment.deposit_amount_cents / 100;

  const baseUrl = getBaseUrl();

  const payload = {
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED"],
    minutesToExpire: 30,
    externalReference: appointment.id,

    callback: {
      successUrl:
        `${baseUrl}/agendar/${slug}/pagamento/${appointment.id}?resultado=sucesso`,

      cancelUrl:
        `${baseUrl}/agendar/${slug}/pagamento/${appointment.id}?resultado=cancelado`,

      expiredUrl:
        `${baseUrl}/agendar/${slug}/pagamento/${appointment.id}?resultado=expirado`,
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

  const response = await fetch(
    `${asaasApiUrl}/checkouts`,
    {
      method: "POST",

      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },

      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const result =
    (await response.json()) as AsaasCheckoutResponse;

  if (!response.ok || !result.id) {
    console.error(
      "Erro ao criar checkout Asaas:",
      result,
    );

    return {
      error:
        result.errors?.[0]?.description ??
        "O Asaas não conseguiu criar o checkout.",
    };
  }

  const checkoutUrl =
    result.link ??
    `https://sandbox.asaas.com/checkoutSession/show/${result.id}`;

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

  redirect(checkoutUrl);
}