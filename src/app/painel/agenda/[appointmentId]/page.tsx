import {
    CalendarDays,
    Clock,
    CreditCard,
    MessageCircle,
    UserRound,
  } from "lucide-react";
  import Link from "next/link";
  import { notFound, redirect } from "next/navigation";
  
  import { CancelButton } from "./cancel-button";
  import { ManualRefundForm } from "./manual-refund-form";
  
  import { buttonVariants } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
  import {
    AsaasRefund,
    getRefundDecision,
    REFUND_STATE_CONTENT,
  } from "@/lib/asaas/refunds";
  import { asaasRequest } from "@/lib/asaas/request";
  import { createClient } from "@/lib/supabase/server";
  
  type AppointmentDetailsPageProps = {
    params: Promise<{
      appointmentId: string;
    }>;
  };

  type AsaasPaymentResponse = { status?: string };
  type AsaasRefundResponse =
    | AsaasRefund[]
    | { data?: AsaasRefund[] };
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
  }
  
  function formatTime(value: string) {
    return value.slice(0, 5);
  }
  
  function formatDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
  
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day, 12));
  }
  
  function getStatusLabel(
    status: string,
    paymentStatus: string | null,
  ) {
    if (
      status === "confirmed" ||
      paymentStatus === "received"
    ) {
      return "Confirmado";
    }
  
    if (status === "pending_payment") {
      return "Aguardando pagamento";
    }
  
    if (status === "cancelled") {
      return "Cancelado";
    }
  
    if (status === "expired") {
      return "Expirado";
    }
  
    return status;
  }
  
  function getStatusClass(
    status: string,
    paymentStatus: string | null,
  ) {
    if (
      status === "confirmed" ||
      paymentStatus === "received"
    ) {
      return "bg-green-600/10 text-green-700";
    }
  
    if (status === "pending_payment") {
      return "bg-amber-500/10 text-amber-700";
    }
  
    if (status === "cancelled") {
      return "bg-red-600/10 text-red-700";
    }
  
    return "bg-muted text-muted-foreground";
  }
  
  export default async function AppointmentDetailsPage({
    params,
  }: AppointmentDetailsPageProps) {
    const { appointmentId } = await params;
  
    const authenticatedSupabase = await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    const { data: profile } = await authenticatedSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
  
    if (!profile?.company_id) {
      redirect("/painel");
    }
  
    const adminSupabase = createAdminClient();
  
    const { data: appointment } = await adminSupabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        payment_status,
        total_amount_cents,
        deposit_amount_cents,
        remaining_amount_cents,
        paid_at,
        asaas_payment_id,
        asaas_environment,
        clients (
          name,
          phone,
          email,
          cpf_cnpj
        ),
        services (
          name,
          description,
          duration_minutes
        )
      `)
      .eq("id", appointmentId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
  
    if (!appointment) {
      notFound();
    }
  
    const client = Array.isArray(appointment.clients)
      ? appointment.clients[0]
      : appointment.clients;
  
    const service = Array.isArray(appointment.services)
      ? appointment.services[0]
      : appointment.services;
  
    const paymentWasReceived =
      appointment.payment_status === "received";

    let refundState: ReturnType<typeof getRefundDecision>["state"] | null = null;
    let refundLookupError = false;

    if (paymentWasReceived && appointment.asaas_payment_id) {
      try {
        const credentials = await getCompanyAsaasCredentials(
          profile.company_id,
          appointment.asaas_environment,
        );
        const paymentId = encodeURIComponent(
          appointment.asaas_payment_id,
        );
        const [payment, refundResponse] = await Promise.all([
          asaasRequest<AsaasPaymentResponse>({
            apiUrl: credentials.apiUrl,
            apiKey: credentials.apiKey,
            path: `/payments/${paymentId}`,
          }),
          asaasRequest<AsaasRefundResponse>({
            apiUrl: credentials.apiUrl,
            apiKey: credentials.apiKey,
            path: `/payments/${paymentId}/refunds`,
          }),
        ]);
        const refunds = Array.isArray(refundResponse)
          ? refundResponse
          : refundResponse.data ?? [];
        refundState = getRefundDecision(payment.status, refunds).state;
      } catch (error) {
        refundLookupError = true;
        console.error("Falha ao consultar estado do estorno:", {
          appointmentId: appointment.id,
          companyId: profile.company_id,
          error:
            error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    const { data: refundHistory, error: refundHistoryError } =
      await adminSupabase
        .from("appointment_refund_operations")
        .select("id, operation_type, status, amount_cents, observation, receipt_url, requested_at, completed_at, asaas_environment")
        .eq("appointment_id", appointment.id)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
  
    const canCancel =
      appointment.status === "confirmed" ||
      appointment.status === "pending_payment";
  
    const agendaUrl =
      `/painel/agenda?mes=${appointment.appointment_date.slice(
        0,
        7,
      )}&dia=${appointment.appointment_date}`;
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={agendaUrl}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar à agenda
          </Link>
  
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-semibold">
                Detalhes do atendimento
              </h1>
  
              <p className="mt-2 text-muted-foreground">
                Consulte os dados da cliente, pagamento e serviço.
              </p>
            </div>
  
            <span
              className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                appointment.status,
                appointment.payment_status,
              )}`}
            >
              {getStatusLabel(
                appointment.status,
                appointment.payment_status,
              )}
            </span>
          </div>
  
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  Atendimento
                </CardTitle>
  
                <CardDescription>
                  Data, horário e serviço escolhido.
                </CardDescription>
              </CardHeader>
  
              <CardContent className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Data
                  </p>
  
                  <p className="font-medium capitalize">
                    {formatDate(appointment.appointment_date)}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Horário
                  </p>
  
                  <p className="flex items-center gap-2 font-medium">
                    <Clock className="size-4" />
                    {formatTime(appointment.start_time)}
                    {" às "}
                    {formatTime(appointment.end_time)}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Serviço
                  </p>
  
                  <p className="font-medium">
                    {service?.name ?? "Serviço"}
                  </p>
  
                  {service?.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                </div>
  
                {service?.duration_minutes ? (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Duração
                    </p>
  
                    <p className="font-medium">
                      {service.duration_minutes} minutos
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="size-5" />
                  Cliente
                </CardTitle>
  
                <CardDescription>
                  Dados de contato da cliente.
                </CardDescription>
              </CardHeader>
  
              <CardContent className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nome
                  </p>
  
                  <p className="font-medium">
                    {client?.name ?? "Cliente não identificada"}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp
                  </p>
  
                  <p className="font-medium">
                    {client?.phone ?? "Não informado"}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    E-mail
                  </p>
  
                  <p className="font-medium">
                    {client?.email ?? "Não informado"}
                  </p>
                </div>
  
                {client?.phone ? (
                  <a
                    href={`https://wa.me/${client.phone.replace(
                      /\D/g,
                      "",
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full gap-2",
                    })}
                  >
                    <MessageCircle className="size-4" />
                    Abrir WhatsApp
                  </a>
                ) : null}
              </CardContent>
            </Card>
          </div>
  
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Pagamento
              </CardTitle>
  
              <CardDescription>
                Valores do atendimento e do sinal.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Valor total
                  </p>
  
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      appointment.total_amount_cents,
                    )}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Sinal
                  </p>
  
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      appointment.deposit_amount_cents,
                    )}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Restante
                  </p>
  
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      appointment.remaining_amount_cents,
                    )}
                  </p>
                </div>
              </div>
  
              {paymentWasReceived ? (
                <div className="mt-6 rounded-lg border border-green-600/30 bg-green-600/10 p-4">
                  <p className="font-medium text-green-700">
                    Sinal recebido
                  </p>
  
                  <p className="mt-1 text-sm text-muted-foreground">
                    O pagamento foi confirmado pelo Asaas.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-700">
                    Pagamento pendente
                  </p>
  
                  <p className="mt-1 text-sm text-muted-foreground">
                    O horário está aguardando o pagamento do sinal.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
  
          {refundState ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Estado da devolução</CardTitle>
                <CardDescription>
                  Situação consultada diretamente no Asaas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">
                  {REFUND_STATE_CONTENT[refundState].label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {REFUND_STATE_CONTENT[refundState].guidance}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {refundLookupError ? (
            <p className="mt-4 text-sm text-amber-800">
              Não foi possível consultar o estado atual do estorno. Nenhum estado foi alterado.
            </p>
          ) : null}

          {!refundHistoryError && (refundHistory?.length ?? 0) > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Histórico de reembolsos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {refundHistory?.map((operation) => (
                  <div key={operation.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {operation.operation_type === "manual" ? "Reembolso manual" : "Estorno Asaas"} — {operation.status}
                    </p>
                    <p>{formatCurrency(operation.amount_cents)}</p>
                    {operation.observation ? <p className="text-muted-foreground">{operation.observation}</p> : null}
                    {operation.receipt_url ? <a className="text-primary underline" href={operation.receipt_url} target="_blank" rel="noreferrer">Abrir comprovante</a> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {canCancel ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Ações</CardTitle>
  
                <CardDescription>
                  Gerencie este atendimento.
                </CardDescription>
              </CardHeader>
  
              <CardContent className="space-y-3">
                <Link
                  href={`/painel/agenda/${appointment.id}/remarcar`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                >
                  Remarcar atendimento
                </Link>
  
                <CancelButton
                  appointmentId={appointment.id}
                  paymentWasReceived={paymentWasReceived}
                />

                {paymentWasReceived && refundState === "cancelled" ? (
                  <ManualRefundForm appointmentId={appointment.id} />
                ) : null}
  
                {paymentWasReceived ? (
                  <p className="text-center text-xs text-muted-foreground">
                    O atendimento só será cancelado depois que o Asaas confirmar o estorno.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>
    );
  }
