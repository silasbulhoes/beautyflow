import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    CreditCard,
    KeyRound,
    RadioTower,
    ReceiptText,
    ShieldCheck,
    WalletCards,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  
  import { FinancialAccountForm } from "./financial-account-form";
  import { PixKeyButton } from "./pix-key-button";
  import { WebhookButton } from "./webhook-button";
  
  import {
    Button,
    buttonVariants,
  } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
  import { asaasRequest } from "@/lib/asaas/request";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type FinancialPageProps = {
    searchParams: Promise<{
      sucesso?: string;
      pix?: string;
      inicio?: string;
      fim?: string;
      situacao?: string;
    }>;
  };
  
  type AppointmentRelation<T> = T | T[] | null;
  
  type FinancialAppointment = {
    id: string;
    appointment_date: string;
    start_time: string;
    status: string;
    payment_status: string | null;
    payment_provider: string | null;
    paid_at: string | null;
    asaas_payment_id: string | null;
    total_amount_cents: number;
    deposit_amount_cents: number;
    remaining_amount_cents: number;
    clients: AppointmentRelation<{
      name: string;
      phone: string;
      email: string | null;
    }>;
    services: AppointmentRelation<{
      name: string;
    }>;
  };
  
  type AsaasAccountStatus = {
    commercialInfo?: string | null;
    bankAccountInfo?: string | null;
    documentation?: string | null;
    general?: string | null;
  };
  
  type AsaasPixKey = {
    status?: string | null;
  };
  
  type AsaasPixKeyListResponse = {
    data?: AsaasPixKey[];
  };
  
  type AsaasWebhook = {
    id?: string;
    name?: string | null;
    url?: string | null;
    enabled?: boolean;
    interrupted?: boolean;
  };
  
  type AsaasWebhookListResponse = {
    data?: AsaasWebhook[];
  };
  
  type FinancialIntegrationStatus = {
    accountStatus: AsaasAccountStatus | null;
    pixActive: boolean;
    pixPending: boolean;
    webhookActive: boolean;
    hasPartialError: boolean;
  };
  
  type PaymentFilter =
    | "todos"
    | "recebidos"
    | "confirmados"
    | "pendentes";
  
  const WEBHOOK_NAME = "BeautyFlow Pagamentos";
  const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
  
  function getSingleRelation<T>(
    relation: AppointmentRelation<T>,
  ) {
    if (Array.isArray(relation)) {
      return relation[0] ?? null;
    }
  
    return relation;
  }
  
  function padNumber(value: number) {
    return String(value).padStart(2, "0");
  }
  
  function isValidDateKey(value: string | undefined) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
  
    const [year, month, day] = value
      .split("-")
      .map(Number);
  
    const date = new Date(
      Date.UTC(year, month - 1, day, 12),
    );
  
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }
  
  function getCurrentMonthRange() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BRAZIL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
  
    const values = Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );
  
    const year = Number(values.year);
    const month = Number(values.month);
  
    const lastDay = new Date(
      Date.UTC(year, month, 0, 12),
    ).getUTCDate();
  
    return {
      startDate: `${year}-${padNumber(month)}-01`,
      endDate: `${year}-${padNumber(
        month,
      )}-${padNumber(lastDay)}`,
    };
  }
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
  }
  
  function formatTime(value: string) {
    return value.slice(0, 5);
  }
  
  function formatAppointmentDate(value: string) {
    const [year, month, day] = value
      .split("-")
      .map(Number);
  
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: BRAZIL_TIME_ZONE,
    }).format(
      new Date(Date.UTC(year, month - 1, day, 12)),
    );
  }
  
  function formatPaymentDate(value: string | null) {
    if (!value) {
      return "Não registrado";
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "Não registrado";
    }
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BRAZIL_TIME_ZONE,
    }).format(date);
  }
  
  function getPaymentFilter(
    value: string | undefined,
  ): PaymentFilter {
    if (
      value === "recebidos" ||
      value === "confirmados" ||
      value === "pendentes"
    ) {
      return value;
    }
  
    return "todos";
  }
  
  function isReceived(
    appointment: FinancialAppointment,
  ) {
    return (
      appointment.payment_status?.toLowerCase() ===
      "received"
    );
  }
  
  function isConfirmed(
    appointment: FinancialAppointment,
  ) {
    return (
      appointment.payment_status?.toLowerCase() ===
      "confirmed"
    );
  }
  
  function isPending(
    appointment: FinancialAppointment,
  ) {
    return (
      appointment.status === "pending_payment" &&
      !isReceived(appointment) &&
      !isConfirmed(appointment)
    );
  }
  
  function matchesPaymentFilter(
    appointment: FinancialAppointment,
    filter: PaymentFilter,
  ) {
    switch (filter) {
      case "recebidos":
        return isReceived(appointment);
  
      case "confirmados":
        return isConfirmed(appointment);
  
      case "pendentes":
        return isPending(appointment);
  
      default:
        return true;
    }
  }
  
  function getPaymentStatusLabel(
    appointment: FinancialAppointment,
  ) {
    if (isReceived(appointment)) {
      return "Recebido";
    }
  
    if (isConfirmed(appointment)) {
      return "Confirmado";
    }
  
    if (appointment.status === "pending_payment") {
      return "Aguardando pagamento";
    }
  
    if (appointment.status === "canceled") {
      return "Cancelado";
    }
  
    if (appointment.status === "expired") {
      return "Expirado";
    }
  
    return "Não identificado";
  }
  
  function getPaymentStatusClass(
    appointment: FinancialAppointment,
  ) {
    if (isReceived(appointment)) {
      return "bg-green-600/10 text-green-700";
    }
  
    if (isConfirmed(appointment)) {
      return "bg-blue-600/10 text-blue-700";
    }
  
    if (appointment.status === "pending_payment") {
      return "bg-amber-500/10 text-amber-800";
    }
  
    if (appointment.status === "canceled") {
      return "bg-red-600/10 text-red-700";
    }
  
    return "bg-muted text-muted-foreground";
  }
  
  function getPaymentProviderLabel(
    provider: string | null,
  ) {
    if (!provider) {
      return "Não informado";
    }
  
    if (provider.toLowerCase() === "asaas") {
      return "Asaas";
    }
  
    return provider;
  }
  
  function getStatusLabel(
    value: string | null | undefined,
  ) {
    switch (value?.toUpperCase()) {
      case "APPROVED":
        return "Aprovado";
  
      case "ACTIVE":
        return "Ativo";
  
      case "PENDING":
        return "Pendente";
  
      case "AWAITING_APPROVAL":
        return "Em análise";
  
      case "AWAITING_ACTIVATION":
        return "Aguardando ativação";
  
      case "REJECTED":
        return "Rejeitado";
  
      case "ERROR":
        return "Erro";
  
      default:
        return "Não consultado";
    }
  }
  
  function getStatusClass(
    value: string | null | undefined,
  ) {
    switch (value?.toUpperCase()) {
      case "APPROVED":
      case "ACTIVE":
        return "bg-green-600/10 text-green-700";
  
      case "REJECTED":
      case "ERROR":
        return "bg-destructive/10 text-destructive";
  
      case "PENDING":
      case "AWAITING_APPROVAL":
      case "AWAITING_ACTIVATION":
        return "bg-amber-500/10 text-amber-800";
  
      default:
        return "bg-muted text-muted-foreground";
    }
  }
  
  async function getFinancialIntegrationStatus(
    companyId: string,
  ): Promise<FinancialIntegrationStatus> {
    const emptyStatus: FinancialIntegrationStatus = {
      accountStatus: null,
      pixActive: false,
      pixPending: false,
      webhookActive: false,
      hasPartialError: false,
    };
  
    try {
      const credentials =
        await getCompanyAsaasCredentials(companyId);
  
      if (!credentials.usingSubaccount) {
        return emptyStatus;
      }
  
      const [
        accountStatusResult,
        pixKeysResult,
        webhooksResult,
      ] = await Promise.allSettled([
        asaasRequest<AsaasAccountStatus>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/myAccount/status/",
          method: "GET",
        }),
  
        asaasRequest<AsaasPixKeyListResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/pix/addressKeys?limit=100&offset=0",
          method: "GET",
        }),
  
        asaasRequest<AsaasWebhookListResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/webhooks?offset=0&limit=100",
          method: "GET",
        }),
      ]);
  
      const accountStatus =
        accountStatusResult.status === "fulfilled"
          ? accountStatusResult.value
          : null;
  
      const pixKeys =
        pixKeysResult.status === "fulfilled" &&
        Array.isArray(pixKeysResult.value.data)
          ? pixKeysResult.value.data
          : [];
  
      const webhooks =
        webhooksResult.status === "fulfilled" &&
        Array.isArray(webhooksResult.value.data)
          ? webhooksResult.value.data
          : [];
  
      const pixActive = pixKeys.some(
        (pixKey) =>
          pixKey.status?.toUpperCase() === "ACTIVE",
      );
  
      const pixPending = pixKeys.some((pixKey) => {
        const status =
          pixKey.status?.toUpperCase();
  
        return (
          status === "AWAITING_ACTIVATION" ||
          status === "PENDING"
        );
      });
  
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(
          /\/$/,
          "",
        );
  
      const expectedWebhookUrl = appUrl
        ? `${appUrl}/api/webhooks/asaas`
        : null;
  
      const beautyFlowWebhook = webhooks.find(
        (webhook) =>
          webhook.name === WEBHOOK_NAME ||
          Boolean(
            expectedWebhookUrl &&
              webhook.url === expectedWebhookUrl,
          ),
      );
  
      const webhookActive = Boolean(
        beautyFlowWebhook?.enabled &&
          !beautyFlowWebhook.interrupted,
      );
  
      const hasPartialError = [
        accountStatusResult,
        pixKeysResult,
        webhooksResult,
      ].some(
        (result) => result.status === "rejected",
      );
  
      return {
        accountStatus,
        pixActive,
        pixPending,
        webhookActive,
        hasPartialError,
      };
    } catch (error) {
      console.error(
        "Erro ao consultar situação financeira:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );
  
      return {
        ...emptyStatus,
        hasPartialError: true,
      };
    }
  }
  
  export default async function FinancialPage({
    searchParams,
  }: FinancialPageProps) {
    const parameters = await searchParams;
  
    const authenticatedSupabase =
      await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    const { data: profile } =
      await authenticatedSupabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
  
    if (!profile?.company_id) {
      redirect("/painel");
    }
  
    const adminSupabase = createAdminClient();
  
    const { data: company } = await adminSupabase
      .from("companies")
      .select(`
        id,
        asaas_account_id,
        asaas_wallet_id,
        asaas_account_status
      `)
      .eq("id", profile.company_id)
      .maybeSingle();
  
    if (!company) {
      redirect("/painel");
    }
  
    const accountIsConnected = Boolean(
      company.asaas_account_id &&
        company.asaas_wallet_id,
    );
  
    const integrationStatus = accountIsConnected
      ? await getFinancialIntegrationStatus(
          company.id,
        )
      : {
          accountStatus: null,
          pixActive: false,
          pixPending: false,
          webhookActive: false,
          hasPartialError: false,
        };
  
    const generalStatus =
      integrationStatus.accountStatus?.general ??
      company.asaas_account_status ??
      "pending";
  
    const accountApproved =
      generalStatus.toUpperCase() === "APPROVED";
  
    const accountRejected =
      generalStatus.toUpperCase() === "REJECTED";
  
    const defaultName =
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
  
    const defaultEmail = user.email ?? "";
  
    const currentMonthRange =
      getCurrentMonthRange();
  
    const requestedStartDate = isValidDateKey(
      parameters.inicio,
    )
      ? parameters.inicio!
      : currentMonthRange.startDate;
  
    const requestedEndDate = isValidDateKey(
      parameters.fim,
    )
      ? parameters.fim!
      : currentMonthRange.endDate;
  
    const startDate =
      requestedStartDate <= requestedEndDate
        ? requestedStartDate
        : requestedEndDate;
  
    const endDate =
      requestedStartDate <= requestedEndDate
        ? requestedEndDate
        : requestedStartDate;
  
    const selectedFilter = getPaymentFilter(
      parameters.situacao,
    );
  
    const {
      data: financialData,
      error: financialError,
    } = await adminSupabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        payment_status,
        payment_provider,
        paid_at,
        asaas_payment_id,
        total_amount_cents,
        deposit_amount_cents,
        remaining_amount_cents,
        clients (
          name,
          phone,
          email
        ),
        services (
          name
        )
      `)
      .eq("company_id", profile.company_id)
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate)
      .order("appointment_date", {
        ascending: false,
      })
      .order("start_time", {
        ascending: false,
      });
  
    const financialAppointments =
      (financialData as
        | FinancialAppointment[]
        | null) ?? [];
  
    const receivedAppointments =
      financialAppointments.filter(isReceived);
  
    const confirmedAppointments =
      financialAppointments.filter(isConfirmed);
  
    const pendingAppointments =
      financialAppointments.filter(isPending);
  
    const receivedAmount = receivedAppointments.reduce(
      (total, appointment) =>
        total +
        Number(
          appointment.deposit_amount_cents ?? 0,
        ),
      0,
    );
  
    const confirmedAmount =
      confirmedAppointments.reduce(
        (total, appointment) =>
          total +
          Number(
            appointment.deposit_amount_cents ?? 0,
          ),
        0,
      );
  
    const pendingAmount = pendingAppointments.reduce(
      (total, appointment) =>
        total +
        Number(
          appointment.deposit_amount_cents ?? 0,
        ),
      0,
    );
  
    const remainingAmount = [
      ...receivedAppointments,
      ...confirmedAppointments,
    ].reduce(
      (total, appointment) =>
        total +
        Number(
          appointment.remaining_amount_cents ?? 0,
        ),
      0,
    );
  
    const filteredAppointments =
      financialAppointments.filter((appointment) =>
        matchesPaymentFilter(
          appointment,
          selectedFilter,
        ),
      );
  
    const currentMonthUrl =
      `/painel/financeiro?inicio=${currentMonthRange.startDate}` +
      `&fim=${currentMonthRange.endDate}&situacao=todos`;
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>
  
          <div className="mt-5">
            <h1 className="text-3xl font-semibold">
              Financeiro
            </h1>
  
            <p className="mt-2 text-muted-foreground">
              Acompanhe sinais, pagamentos pendentes e
              a integração da sua conta.
            </p>
          </div>
  
          {parameters.sucesso === "1" ? (
            <div className="mt-6 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <p className="flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="size-5" />
                Conta financeira criada
              </p>
  
              <p className="mt-1 text-sm text-muted-foreground">
                A subconta foi vinculada ao BeautyFlow
                com segurança.
              </p>
            </div>
          ) : null}
  
          {parameters.sucesso === "1" &&
          parameters.pix === "1" ? (
            <div className="mt-4 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <p className="flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="size-5" />
                Chave Pix configurada
              </p>
            </div>
          ) : null}
  
          {accountIsConnected ? (
            <>
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>
                    Filtrar movimentações
                  </CardTitle>
  
                  <CardDescription>
                    O período considera a data marcada
                    para o atendimento.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  <form
                    method="GET"
                    action="/painel/financeiro"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]"
                  >
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Data inicial
                      </span>
  
                      <input
                        type="date"
                        name="inicio"
                        defaultValue={startDate}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </label>
  
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Data final
                      </span>
  
                      <input
                        type="date"
                        name="fim"
                        defaultValue={endDate}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </label>
  
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        Situação
                      </span>
  
                      <select
                        name="situacao"
                        defaultValue={selectedFilter}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="todos">
                          Todos
                        </option>
  
                        <option value="recebidos">
                          Recebidos
                        </option>
  
                        <option value="confirmados">
                          Confirmados
                        </option>
  
                        <option value="pendentes">
                          Pendentes
                        </option>
                      </select>
                    </label>
  
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        className="w-full"
                      >
                        Aplicar
                      </Button>
                    </div>
  
                    <div className="flex items-end">
                      <Link
                        href={currentMonthUrl}
                        className={buttonVariants({
                          variant: "outline",
                          className: "w-full",
                        })}
                      >
                        Mês atual
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
  
              {financialError ? (
                <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Não foi possível carregar as
                  movimentações financeiras.
                </div>
              ) : null}
  
              <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recebido no período
                    </CardTitle>
  
                    <CircleDollarSign className="size-5 text-green-700" />
                  </CardHeader>
  
                  <CardContent>
                    <p className="text-3xl font-semibold text-green-700">
                      {formatCurrency(
                        receivedAmount,
                      )}
                    </p>
  
                    <p className="mt-1 text-xs text-muted-foreground">
                      {receivedAppointments.length}{" "}
                      pagamento(s) recebido(s)
                    </p>
                  </CardContent>
                </Card>
  
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Confirmado a receber
                    </CardTitle>
  
                    <CreditCard className="size-5 text-blue-700" />
                  </CardHeader>
  
                  <CardContent>
                    <p className="text-3xl font-semibold text-blue-700">
                      {formatCurrency(
                        confirmedAmount,
                      )}
                    </p>
  
                    <p className="mt-1 text-xs text-muted-foreground">
                      {confirmedAppointments.length}{" "}
                      pagamento(s) confirmado(s)
                    </p>
                  </CardContent>
                </Card>
  
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Aguardando pagamento
                    </CardTitle>
  
                    <Clock3 className="size-5 text-amber-700" />
                  </CardHeader>
  
                  <CardContent>
                    <p className="text-3xl font-semibold text-amber-700">
                      {formatCurrency(
                        pendingAmount,
                      )}
                    </p>
  
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pendingAppointments.length}{" "}
                      sinal(is) pendente(s)
                    </p>
                  </CardContent>
                </Card>
  
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Restante dos serviços
                    </CardTitle>
  
                    <Banknote className="size-5 text-muted-foreground" />
                  </CardHeader>
  
                  <CardContent>
                    <p className="text-3xl font-semibold">
                      {formatCurrency(
                        remainingAmount,
                      )}
                    </p>
  
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor a cobrar nos atendimentos pagos
                    </p>
                  </CardContent>
                </Card>
              </section>
  
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ReceiptText className="size-5" />
                        Histórico de pagamentos
                      </CardTitle>
  
                      <CardDescription className="mt-1">
                        Cliente, serviço, atendimento e
                        valor do sinal.
                      </CardDescription>
                    </div>
  
                    <span className="text-sm text-muted-foreground">
                      {filteredAppointments.length}{" "}
                      registro(s)
                    </span>
                  </div>
                </CardHeader>
  
                <CardContent>
                  {filteredAppointments.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-14 text-center">
                      <ReceiptText className="mx-auto size-10 text-muted-foreground" />
  
                      <p className="mt-4 font-medium">
                        Nenhuma movimentação encontrada
                      </p>
  
                      <p className="mt-1 text-sm text-muted-foreground">
                        Altere o período ou a situação do
                        filtro.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAppointments.map(
                        (appointment) => {
                          const client =
                            getSingleRelation(
                              appointment.clients,
                            );
  
                          const service =
                            getSingleRelation(
                              appointment.services,
                            );
  
                          return (
                            <Link
                              key={appointment.id}
                              href={`/painel/agenda/${appointment.id}`}
                              className="group block rounded-xl border p-4 transition-colors hover:bg-muted/50"
                            >
                              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">
                                      {client?.name ??
                                        "Cliente não identificada"}
                                    </p>
  
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-medium ${getPaymentStatusClass(
                                        appointment,
                                      )}`}
                                    >
                                      {getPaymentStatusLabel(
                                        appointment,
                                      )}
                                    </span>
                                  </div>
  
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {service?.name ??
                                      "Serviço não identificado"}
                                  </p>
  
                                  <p className="mt-2 text-sm capitalize">
                                    {formatAppointmentDate(
                                      appointment.appointment_date,
                                    )}
                                    {" · "}
                                    {formatTime(
                                      appointment.start_time,
                                    )}
                                  </p>
                                </div>
  
                                <div className="flex items-center justify-between gap-4 lg:justify-end">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                      Valor do sinal
                                    </p>
  
                                    <p className="text-lg font-semibold">
                                      {formatCurrency(
                                        appointment.deposit_amount_cents,
                                      )}
                                    </p>
                                  </div>
  
                                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                </div>
                              </div>
  
                              <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Valor total
                                  </p>
  
                                  <p className="mt-1 font-medium">
                                    {formatCurrency(
                                      appointment.total_amount_cents,
                                    )}
                                  </p>
                                </div>
  
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Restante
                                  </p>
  
                                  <p className="mt-1 font-medium">
                                    {formatCurrency(
                                      appointment.remaining_amount_cents,
                                    )}
                                  </p>
                                </div>
  
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Data do pagamento
                                  </p>
  
                                  <p className="mt-1 font-medium">
                                    {formatPaymentDate(
                                      appointment.paid_at,
                                    )}
                                  </p>
                                </div>
  
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Processado por
                                  </p>
  
                                  <p className="mt-1 font-medium">
                                    {getPaymentProviderLabel(
                                      appointment.payment_provider,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          );
                        },
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
  
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletCards className="size-5" />
                    Integração da conta
                  </CardTitle>
  
                  <CardDescription>
                    Situação da subconta que recebe os
                    pagamentos dos agendamentos.
                  </CardDescription>
                </CardHeader>
  
                <CardContent className="space-y-5">
                  {integrationStatus.hasPartialError ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                      <AlertTriangle className="mt-0.5 size-5 text-amber-800" />
  
                      <div>
                        <p className="font-medium text-amber-800">
                          Consulta parcialmente indisponível
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          Não foi possível consultar todos
                          os recursos do Asaas. Atualize a
                          página em alguns instantes.
                        </p>
                      </div>
                    </div>
                  ) : null}
  
                  {accountApproved ? (
                    <div className="flex items-start gap-3 rounded-lg border border-green-600/30 bg-green-600/10 p-4">
                      <CheckCircle2 className="mt-0.5 size-5 text-green-700" />
  
                      <div>
                        <p className="font-medium text-green-700">
                          Conta aprovada
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A situação cadastral da subconta
                          está aprovada no Asaas.
                        </p>
                      </div>
                    </div>
                  ) : accountRejected ? (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                      <AlertTriangle className="mt-0.5 size-5 text-destructive" />
  
                      <div>
                        <p className="font-medium text-destructive">
                          Conta rejeitada
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A situação cadastral precisa ser
                          regularizada no Asaas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                      <Clock3 className="mt-0.5 size-5 text-amber-800" />
  
                      <div>
                        <p className="font-medium text-amber-800">
                          Cadastro em análise
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A subconta ainda possui alguma
                          etapa cadastral pendente.
                        </p>
                      </div>
                    </div>
                  )}
  
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <ShieldCheck className="mt-0.5 size-5 text-green-700" />
  
                    <div>
                      <p className="font-medium">
                        Credencial protegida
                      </p>
  
                      <p className="mt-1 text-sm text-muted-foreground">
                        A chave da subconta está
                        criptografada e não é exibida no
                        painel.
                      </p>
                    </div>
                  </div>
  
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Situação geral
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          generalStatus,
                        )}`}
                      >
                        {getStatusLabel(
                          generalStatus,
                        )}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Dados comerciais
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.commercialInfo,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.commercialInfo,
                        )}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Documentação
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.documentation,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.documentation,
                        )}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Conta bancária
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.bankAccountInfo,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.bankAccountInfo,
                        )}
                      </span>
                    </div>
                  </div>
  
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="flex items-center gap-2 font-medium">
                        <KeyRound className="size-4" />
                        Chave Pix da conta
                      </p>
  
                      {integrationStatus.pixActive ? (
                        <div className="mt-4 rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <CheckCircle2 className="size-4" />
                            Chave Pix ativa
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {integrationStatus.pixPending
                              ? "A chave Pix ainda está aguardando ativação."
                              : "A subconta ainda não possui uma chave Pix ativa."}
                          </p>
  
                          <div className="mt-4">
                            <PixKeyButton />
                          </div>
                        </>
                      )}
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="flex items-center gap-2 font-medium">
                        <RadioTower className="size-4" />
                        Confirmação automática
                      </p>
  
                      {integrationStatus.webhookActive ? (
                        <div className="mt-4 rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <CheckCircle2 className="size-4" />
                            Webhook ativo
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Configure o webhook para
                            confirmar pagamentos
                            automaticamente.
                          </p>
  
                          <div className="mt-4">
                            <WebhookButton />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>
                  Criar conta de recebimento
                </CardTitle>
  
                <CardDescription>
                  Preencha os dados exatamente como
                  aparecem nos documentos da titular.
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <FinancialAccountForm
                  defaultName={defaultName}
                  defaultEmail={defaultEmail}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }