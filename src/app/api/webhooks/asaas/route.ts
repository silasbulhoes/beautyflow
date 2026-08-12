import {
    createHash,
    timingSafeEqual,
  } from "crypto";
  import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
  import { asaasRequest } from "@/lib/asaas/request";
  import { getProfessionalAsaasRuntime } from "@/lib/asaas/environment";
  import { createAdminClient } from "@/lib/supabase/admin";
  
  export const runtime = "nodejs";
  
  type AsaasWebhookPayload = {
    id?: string;
    event?: string;
    dateCreated?: string;
  
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
    paid_at: string | null;
  };
  
  type RegisterEventResult = {
    event_row_id: string;
    should_process: boolean;
    current_status: string;
    current_delivery_count: number;
  };
  
  type AuditStatus =
    | "processed"
    | "ignored"
    | "unmatched"
    | "failed";
  
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
  
  function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message.slice(0, 1000);
    }
  
    return "Erro desconhecido.";
  }
  
  function getPayloadHash(rawBody: string) {
    return createHash("sha256")
      .update(rawBody, "utf8")
      .digest("hex");
  }
  
  async function updateEventAudit({
    eventRowId,
    status,
    companyId,
    appointmentId,
    paymentId,
    errorMessage,
    environment,
  }: {
    eventRowId: string;
    status: AuditStatus;
    companyId?: string | null;
    appointmentId?: string | null;
    paymentId?: string | null;
    errorMessage?: string | null;
    environment: "sandbox" | "production";
  }) {
    const supabase = createAdminClient();
  
    const { error } = await supabase
      .from("asaas_webhook_events")
      .update({
        processing_status: status,
        company_id: companyId ?? null,
        appointment_id:
          appointmentId ?? null,
        payment_id: paymentId ?? null,
        processed_at:
          new Date().toISOString(),
        last_error:
          errorMessage?.slice(0, 1000) ??
          null,
      })
      .eq("id", eventRowId)
      .eq("asaas_environment", environment);
  
    if (error) {
      console.error(
        "Erro ao atualizar auditoria do webhook:",
        {
          code: error.code,
          message: error.message,
          eventRowId,
        },
      );
    }
  }
  
  async function findAppointment({
    companyId,
    paymentId,
    checkoutId,
    externalReference,
    environment,
  }: {
    companyId: string | null;
    paymentId: string | null;
    checkoutId: string | null;
    externalReference: string | null;
    environment: "sandbox" | "production";
  }) {
    const supabase = createAdminClient();
  
    const selectedColumns = `
      id,
      company_id,
      status,
      payment_status,
      paid_at
    `;
  
    if (paymentId) {
      let query = supabase
        .from("appointments")
        .select(selectedColumns)
        .eq("asaas_payment_id", paymentId)
        .eq("asaas_environment", environment);
  
      if (companyId) {
        query = query.eq(
          "company_id",
          companyId,
        )
        .eq("asaas_environment", environment);
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
        .select(selectedColumns)
        .eq(
          "asaas_checkout_id",
          checkoutId,
        )
        .eq("asaas_environment", environment);
  
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
        .select(selectedColumns)
        .eq("id", externalReference)
        .eq("asaas_environment", environment);
  
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
  
  export async function POST(
    request: NextRequest,
  ) {
    const runtime = getProfessionalAsaasRuntime();
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
  
    const rawBody = await request.text();
  
    let payload: AsaasWebhookPayload;
  
    try {
      payload = JSON.parse(
        rawBody,
      ) as AsaasWebhookPayload;
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
  
    const eventId =
      String(payload.id ?? "").trim();
  
    const event =
      String(payload.event ?? "").trim();
  
    const eventCreatedAt =
      String(
        payload.dateCreated ?? "",
      ).trim();
  
    const paymentId =
      payload.payment?.id ?? null;
  
    const accountId =
      payload.account?.id ?? null;
  
    if (!eventId || !event) {
      return NextResponse.json(
        {
          error:
            "Evento sem identificador ou tipo.",
        },
        {
          status: 400,
        },
      );
    }
  
    const supabase = createAdminClient();
  
    const payloadSummary = {
      id: eventId,
      event,
      dateCreated:
        eventCreatedAt || null,
  
      account: {
        id: accountId,
      },
  
      payment: {
        id: paymentId,
        externalReference:
          payload.payment
            ?.externalReference ?? null,
        checkoutSession:
          payload.payment
            ?.checkoutSession ?? null,
        status:
          payload.payment?.status ?? null,
      },
    };
  
    const { data: registrationData, error:
      registrationError } =
      await supabase.rpc(
        "register_asaas_webhook_event",
        {
          p_event_id: `${runtime.environment}:${eventId}`,
          p_event_type: event,
          p_asaas_created_at:
            eventCreatedAt,
          p_account_id: accountId,
          p_payment_id: paymentId,
          p_payload_sha256:
            getPayloadHash(rawBody),
          p_payload_summary:
            payloadSummary,
        },
      );
  
    if (registrationError) {
      console.error(
        "Erro ao registrar evento do webhook:",
        {
          code: registrationError.code,
          message:
            registrationError.message,
          eventId,
          event,
        },
      );
  
      return NextResponse.json(
        {
          error:
            "Não foi possível registrar o evento.",
        },
        {
          status: 500,
        },
      );
    }
  
    const registration = (
      Array.isArray(registrationData)
        ? registrationData[0]
        : registrationData
    ) as RegisterEventResult | null;
  
    if (!registration?.event_row_id) {
      return NextResponse.json(
        {
          error:
            "Registro do evento não retornado.",
        },
        {
          status: 500,
        },
      );
    }
  
    if (!registration.should_process) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        status:
          registration.current_status,
        deliveries:
          registration
            .current_delivery_count,
      });
    }
  
    const eventRowId =
      registration.event_row_id;

    const { data: isolatedEvent, error: eventEnvironmentError } = await supabase
      .from("asaas_webhook_events")
      .update({ asaas_environment: runtime.environment })
      .eq("id", eventRowId)
      .or(`asaas_environment.is.null,asaas_environment.eq.${runtime.environment}`)
      .select("id")
      .maybeSingle();

    if (eventEnvironmentError || !isolatedEvent) {
      console.error("Webhook recusado por falha ao fixar ambiente:", {
        eventId,
        environment: runtime.environment,
        code: eventEnvironmentError?.code ?? null,
        message: eventEnvironmentError?.message ?? "Evento nao encontrado no ambiente esperado.",
      });
      return NextResponse.json({ error: "Nao foi possivel isolar o ambiente do evento." }, { status: 500 });
    }
  
    const confirmedEvents = new Set([
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
    ]);
  
    if (
      !paymentId ||
      !confirmedEvents.has(event)
    ) {
      await updateEventAudit({
        eventRowId,
        status: "ignored",
        paymentId,
        environment: runtime.environment,
      });
  
      console.info(
        "Evento Asaas registrado e ignorado:",
        {
          eventId,
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
  
    let companyId: string | null = null;
  
    try {
      if (accountId) {
        const { data: connection } =
          await supabase
            .from("company_asaas_connections")
            .select("company_id")
            .eq("environment", runtime.environment)
            .eq(
              "account_id",
              accountId,
            )
            .maybeSingle();
  
        companyId = connection?.company_id ?? null;
      }

      // account.id do webhook identifica a conta Asaas, mas esse ID pode não
      // estar disponível no provisionamento. O checkout já persistido é a
      // correlação autoritativa e isolada por ambiente para descobrir a empresa.
      const payloadAppointment = await findAppointment({
        companyId,
        paymentId,
        checkoutId: payload.payment?.checkoutSession ?? null,
        externalReference: payload.payment?.externalReference ?? null,
        environment: runtime.environment,
      });

      if (!companyId && payloadAppointment) {
        companyId = payloadAppointment.company_id;
      }
  
      let apiUrl =
        process.env.ASAAS_API_URL
          ?.replace(/\/$/, "");
  
      let apiKey: string | undefined;
  
      if (companyId) {
        const credentials =
          await getCompanyAsaasCredentials(
            companyId,
            runtime.environment,
          );
  
        apiUrl = credentials.apiUrl;
        apiKey = credentials.apiKey;
      }
  
      if (!apiUrl || !apiKey) {
        throw new Error(
          "Integração Asaas não configurada.",
        );
      }
  
      let fullPayment: AsaasPayment =
        payload.payment ?? {};
  
      fullPayment =
        await asaasRequest<AsaasPayment>({
          apiUrl,
          apiKey,
          path: `/payments/${paymentId}`,
          method: "GET",
        });
  
      const checkoutId =
        fullPayment.checkoutSession ??
        payload.payment
          ?.checkoutSession ??
        null;
  
      const externalReference =
        fullPayment.externalReference ??
        payload.payment
          ?.externalReference ??
        null;
  
      const appointment =
        payloadAppointment ?? await findAppointment({
          companyId,
          paymentId,
          environment: runtime.environment,
          checkoutId,
          externalReference,
        });
  
      if (!appointment) {
        await updateEventAudit({
          eventRowId,
          status: "unmatched",
          companyId,
          paymentId,
          environment: runtime.environment,
          errorMessage:
            "Nenhum agendamento foi encontrado para o pagamento.",
        });
  
        console.error(
          "Evento Asaas sem agendamento correspondente:",
          {
            eventId,
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
        event === "PAYMENT_RECEIVED" ||
        appointment.payment_status ===
          "received"
          ? "received"
          : "confirmed";
  
      const { error: updateError } =
        await supabase
          .from("appointments")
          .update({
            status: "confirmed",
            payment_status:
              paymentStatus,
            asaas_payment_id:
              paymentId,
  
            paid_at:
              appointment.paid_at ??
              new Date().toISOString(),
          })
          .eq("id", appointment.id)
          .eq(
            "company_id",
            appointment.company_id,
          )
          .eq("asaas_environment", runtime.environment);
  
      if (updateError) {
        throw new Error(
          `Não foi possível atualizar o agendamento: ${updateError.message}`,
        );
      }
  
      await updateEventAudit({
        eventRowId,
        status: "processed",
        companyId:
          appointment.company_id,
        appointmentId:
          appointment.id,
        paymentId,
        environment: runtime.environment,
      });
  
      console.info(
        "Evento Asaas processado:",
        {
          eventId,
          event,
          paymentId,
          accountId,
          companyId:
            appointment.company_id,
          appointmentId:
            appointment.id,
        },
      );
  
      return NextResponse.json({
        received: true,
        processed: true,
        appointmentId:
          appointment.id,
      });
    } catch (error) {
      const errorMessage =
        getErrorMessage(error);
  
      await updateEventAudit({
        eventRowId,
        status: "failed",
        companyId,
        paymentId,
        errorMessage,
        environment: runtime.environment,
      });
  
      console.error(
        "Erro ao processar webhook Asaas:",
        {
          eventId,
          event,
          paymentId,
          accountId,
          error: errorMessage,
        },
      );
  
      return NextResponse.json(
        {
          error:
            "Não foi possível processar o evento.",
        },
        {
          status: 500,
        },
      );
    }
  }
