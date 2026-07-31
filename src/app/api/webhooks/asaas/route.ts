import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type AsaasPaymentWebhook = {
  id?: string;
  status?: string;
  externalReference?: string;
  confirmedDate?: string;
  clientPaymentDate?: string;
  paymentDate?: string;
};

type AsaasCheckoutWebhook = {
  id?: string;
  status?: string;
  externalReference?: string;
};

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: AsaasPaymentWebhook;
  checkout?: AsaasCheckoutWebhook;
};

type AsaasPaymentDetails = {
  id?: string;
  status?: string;
  externalReference?: string;
  checkoutSession?: string;
  confirmedDate?: string;
  clientPaymentDate?: string;
  paymentDate?: string;
};

const confirmedEvents = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "CHECKOUT_PAID",
]);

const expiredEvents = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "CHECKOUT_EXPIRED",
  "CHECKOUT_CANCELED",
]);

const refundedEvents = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);

async function getPaymentDetails(
  paymentId: string,
): Promise<AsaasPaymentDetails | null> {
  const apiKey = process.env.ASAAS_API_KEY;

  const apiUrl =
    process.env.ASAAS_API_URL ??
    "https://api-sandbox.asaas.com/v3";

  if (!apiKey) {
    console.error("ASAAS_API_KEY não configurada.");
    return null;
  }

  const response = await fetch(
    `${apiUrl}/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        access_token: apiKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    console.error(
      "Erro ao consultar pagamento no Asaas:",
      response.status,
      errorBody,
    );

    return null;
  }

  return (await response.json()) as AsaasPaymentDetails;
}

export async function POST(request: Request) {
  const configuredToken =
    process.env.ASAAS_WEBHOOK_TOKEN;

  const receivedToken = request.headers.get(
    "asaas-access-token",
  );

  if (
    !configuredToken ||
    !receivedToken ||
    receivedToken !== configuredToken
  ) {
    return NextResponse.json(
      {
        received: false,
        error: "Token inválido.",
      },
      {
        status: 401,
      },
    );
  }

  let payload: AsaasWebhookPayload;

  try {
    payload =
      (await request.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        received: false,
        error: "Conteúdo inválido.",
      },
      {
        status: 400,
      },
    );
  }

  const event = payload.event;
  const payment = payload.payment;
  const checkout = payload.checkout;

  if (!event) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Evento não informado.",
    });
  }

  let externalReference =
    checkout?.externalReference ??
    payment?.externalReference ??
    null;

  let checkoutId = checkout?.id ?? null;
  const paymentId = payment?.id ?? null;

  let paymentDetails: AsaasPaymentDetails | null = null;

  if (
    !externalReference &&
    !checkoutId &&
    paymentId
  ) {
    paymentDetails =
      await getPaymentDetails(paymentId);

    externalReference =
      paymentDetails?.externalReference ?? null;

    checkoutId =
      paymentDetails?.checkoutSession ?? null;
  }

  console.log("Webhook Asaas recebido:", {
    event,
    externalReference,
    checkoutId,
    paymentId,
  });

  const supabase = createAdminClient();

  let appointmentQuery = supabase
    .from("appointments")
    .select(
      "id, status, payment_status, asaas_checkout_id",
    );

  if (externalReference) {
    appointmentQuery = appointmentQuery.eq(
      "id",
      externalReference,
    );
  } else if (checkoutId) {
    appointmentQuery = appointmentQuery.eq(
      "asaas_checkout_id",
      checkoutId,
    );
  } else {
    console.warn(
      "Webhook sem referência utilizável:",
      {
        event,
        paymentId,
      },
    );

    return NextResponse.json({
      received: true,
      ignored: true,
      reason:
        "Não foi possível relacionar o pagamento ao agendamento.",
    });
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await appointmentQuery.maybeSingle();

  if (appointmentError) {
    console.error(
      "Erro ao buscar agendamento:",
      appointmentError,
    );

    return NextResponse.json(
      {
        received: false,
        error: "Erro interno.",
      },
      {
        status: 500,
      },
    );
  }

  if (!appointment) {
    console.warn(
      "Agendamento não encontrado:",
      {
        externalReference,
        checkoutId,
        paymentId,
      },
    );

    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Agendamento não encontrado.",
    });
  }

  if (confirmedEvents.has(event)) {
    const paidAt =
      payment?.confirmedDate ??
      payment?.clientPaymentDate ??
      payment?.paymentDate ??
      paymentDetails?.confirmedDate ??
      paymentDetails?.clientPaymentDate ??
      paymentDetails?.paymentDate ??
      new Date().toISOString();

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        payment_status: "received",
        asaas_payment_id:
          paymentId ?? checkoutId,
        paid_at: paidAt,
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error(
        "Erro ao confirmar agendamento:",
        updateError,
      );

      return NextResponse.json(
        {
          received: false,
          error: "Erro ao atualizar agendamento.",
        },
        {
          status: 500,
        },
      );
    }

    console.log("Agendamento confirmado:", {
      appointmentId: appointment.id,
      event,
      paymentId,
    });

    return NextResponse.json({
      received: true,
      updated: true,
      appointmentId: appointment.id,
      status: "confirmed",
    });
  }

  if (expiredEvents.has(event)) {
    const paymentStatus =
      event === "CHECKOUT_CANCELED"
        ? "canceled"
        : "expired";

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "expired",
        payment_status: paymentStatus,
        asaas_payment_id:
          paymentId ?? checkoutId,
      })
      .eq("id", appointment.id)
      .neq("status", "confirmed");

    if (updateError) {
      console.error(
        "Erro ao expirar agendamento:",
        updateError,
      );

      return NextResponse.json(
        {
          received: false,
          error: "Erro ao atualizar agendamento.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      received: true,
      updated: true,
      appointmentId: appointment.id,
      status: paymentStatus,
    });
  }

  if (refundedEvents.has(event)) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        payment_status: "refunded",
        asaas_payment_id:
          paymentId ?? checkoutId,
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error(
        "Erro ao registrar estorno:",
        updateError,
      );

      return NextResponse.json(
        {
          received: false,
          error: "Erro ao atualizar pagamento.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      received: true,
      updated: true,
      appointmentId: appointment.id,
      status: "refunded",
    });
  }

  const intermediateStatus =
    payment?.status?.toLowerCase() ??
    checkout?.status?.toLowerCase() ??
    paymentDetails?.status?.toLowerCase() ??
    "pending";

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      asaas_payment_id:
        paymentId ?? checkoutId,
      payment_status: intermediateStatus,
    })
    .eq("id", appointment.id);

  if (updateError) {
    console.error(
      "Erro ao atualizar status intermediário:",
      updateError,
    );

    return NextResponse.json(
      {
        received: false,
        error: "Erro ao atualizar pagamento.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    received: true,
    updated: true,
    appointmentId: appointment.id,
    status: intermediateStatus,
  });
}