import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
import { asaasRequest } from "@/lib/asaas/request";
import { createAdminClient } from "@/lib/supabase/admin";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  account?: {
    id?: string;
    ownerId?: string | null;
  };
  payment?: {
    id?: string;
    externalReference?: string | null;
    checkoutSession?: string | null;
    status?: string | null;
  };
};

type AsaasPayment = {
  id?: string;
  externalReference?: string | null;
  checkoutSession?: string | null;
  status?: string | null;
};

type AppointmentRecord = {
  id: string;
  company_id: string;
  status: string;
  payment_status: string | null;
};

function tokensAreEqual(
  receivedToken: string,
  expectedToken: string,
) {
  const receivedBuffer =
    Buffer.from(receivedToken);

  const expectedBuffer =
    Buffer.from(expectedToken);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}

async function findAppointment({
  companyId,
  paymentId,
  checkoutId,
  externalReference,
}: {
  companyId: string | null;
  paymentId: string | null;
  checkoutId: string | null;
  externalReference: string | null;
}) {
  const supabase = createAdminClient();

  if (paymentId) {
    let query = supabase
      .from("appointments")
      .select(`
        id,
        company_id,
        status,
        payment_status
      `)
      .eq("asaas_payment_id", paymentId);

    if (companyId) {
      query = query.eq(
        "company_id",
        companyId,
      );
    }

    const { data } =
      await query.maybeSingle();

    if (data) {
      return data as AppointmentRecord;
    }
  }

  if (checkoutId) {
    let query = supabase
      .from("appointments")
      .select(`
        id,
        company_id,
        status,
        payment_status
      `)
      .eq("asaas_checkout_id", checkoutId);

    if (companyId) {
      query = query.eq(
        "company_id",
        companyId,
      );
    }

    const { data } =
      await query.maybeSingle();

    if (data) {
      return data as AppointmentRecord;
    }
  }

  if (externalReference) {
    let query = supabase
      .from("appointments")
      .select(`
        id,
        company_id,
        status,
        payment_status
      `)
      .eq("id", externalReference);

    if (companyId) {
      query = query.eq(
        "company_id",
        companyId,
      );
    }

    const { data } =
      await query.maybeSingle();

    if (data) {
      return data as AppointmentRecord;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const expectedToken =
    process.env.ASAAS_WEBHOOK_TOKEN?.trim();

  const receivedToken =
    request.headers
      .get("asaas-access-token")
      ?.trim();

  if (
    !expectedToken ||
    !receivedToken ||
    !tokensAreEqual(
      receivedToken,
      expectedToken,
    )
  ) {
    console.error(
      "Webhook Asaas recusado: token inválido.",
    );

    return NextResponse.json(
      {
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
      (await request.json()) as
        AsaasWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        error: "Corpo inválido.",
      },
      {
        status: 400,
      },
    );
  }

  const event = payload.event ?? "";
  const paymentId =
    payload.payment?.id ?? null;

  const accountId =
    payload.account?.id ?? null;

  if (!event || !paymentId) {
    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const confirmedEvents = new Set([
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
  ]);

  if (!confirmedEvents.has(event)) {
    console.info(
      "Evento Asaas recebido e ignorado:",
      {
        event,
        paymentId,
        accountId,
      },
    );

    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const supabase = createAdminClient();

  let companyId: string | null = null;

  if (accountId) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("asaas_account_id", accountId)
      .maybeSingle();

    companyId = company?.id ?? null;
  }

  let apiUrl =
    process.env.ASAAS_API_URL?.replace(
      /\/$/,
      "",
    );

  let apiKey =
    process.env.ASAAS_API_KEY;

  if (companyId) {
    try {
      const credentials =
        await getCompanyAsaasCredentials(
          companyId,
        );

      apiUrl = credentials.apiUrl;
      apiKey = credentials.apiKey;
    } catch (error) {
      console.error(
        "Erro ao acessar a subconta do webhook:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível acessar a conta financeira.",
        },
        {
          status: 500,
        },
      );
    }
  }

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        error:
          "Integração Asaas não configurada.",
      },
      {
        status: 500,
      },
    );
  }

  let fullPayment: AsaasPayment =
    payload.payment ?? {};

  try {
    fullPayment =
      await asaasRequest<AsaasPayment>({
        apiUrl,
        apiKey,
        path: `/payments/${paymentId}`,
        method: "GET",
      });
  } catch (error) {
    console.error(
      "Erro ao consultar pagamento do webhook:",
      {
        event,
        paymentId,
        accountId,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",
      },
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível consultar o pagamento.",
      },
      {
        status: 500,
      },
    );
  }

  const checkoutId =
    fullPayment.checkoutSession ??
    payload.payment?.checkoutSession ??
    null;

  const externalReference =
    fullPayment.externalReference ??
    payload.payment?.externalReference ??
    null;

  const appointment = await findAppointment({
    companyId,
    paymentId,
    checkoutId,
    externalReference,
  });

  if (!appointment) {
    console.error(
      "Agendamento não encontrado para o webhook:",
      {
        event,
        paymentId,
        checkoutId,
        externalReference,
        accountId,
      },
    );

    return NextResponse.json({
      received: true,
      appointmentFound: false,
    });
  }

  const paymentStatus =
    event === "PAYMENT_RECEIVED"
      ? "received"
      : "confirmed";

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      payment_status: paymentStatus,
      asaas_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", appointment.id)
    .eq(
      "company_id",
      appointment.company_id,
    );

  if (updateError) {
    console.error(
      "Erro ao confirmar agendamento pelo webhook:",
      updateError,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar o agendamento.",
      },
      {
        status: 500,
      },
    );
  }

  console.info(
    "Agendamento confirmado pelo webhook:",
    {
      appointmentId: appointment.id,
      companyId:
        appointment.company_id,
      event,
      paymentId,
      accountId,
    },
  );

  return NextResponse.json({
    received: true,
    confirmed: true,
  });
}