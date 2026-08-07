import {
    CalendarDays,
    Clock,
    MessageCircle,
    UserRound,
  } from "lucide-react";
  import Link from "next/link";
  import { notFound, redirect } from "next/navigation";
  
  import { buttonVariants } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type ClienteHistoricoPageProps = {
    params: Promise<{
      clientId: string;
    }>;
  };
  
  type ClientRecord = {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    cpf_cnpj: string | null;
    created_at: string;
  };
  
  type AppointmentRecord = {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string | null;
    total_amount_cents: number;
    deposit_amount_cents: number;
    remaining_amount_cents: number;
    paid_at: string | null;
    services:
      | {
          name: string;
        }
      | Array<{
          name: string;
        }>
      | null;
  };
  
  function onlyDigits(value: string | null | undefined) {
    return String(value ?? "").replace(/\D/g, "");
  }
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
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
  
  
  function formatTime(value: string) {
    return value.slice(0, 5);
  }
  
  function getTodayString() {
    const today = new Date();
  
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
  
    return `${year}-${month}-${day}`;
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
  
    if (paymentStatus === "refunded") {
      return "Estornado";
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
  
    if (paymentStatus === "refunded") {
      return "bg-purple-600/10 text-purple-700";
    }
  
    return "bg-muted text-muted-foreground";
  }
  
  export default async function ClienteHistoricoPage({
    params,
  }: ClienteHistoricoPageProps) {
    const { clientId } = await params;
  
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
  
    const { data: selectedClient } = await adminSupabase
      .from("clients")
      .select(`
        id,
        name,
        phone,
        email,
        cpf_cnpj,
        created_at
      `)
      .eq("id", clientId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
  
    if (!selectedClient) {
      notFound();
    }
  
    const normalizedPhone = onlyDigits(selectedClient.phone);
    const normalizedDocument = onlyDigits(
      selectedClient.cpf_cnpj,
    );
  
    const { data: allCompanyClients, error: clientsError } =
      await adminSupabase
        .from("clients")
        .select(`
          id,
          name,
          phone,
          email,
          cpf_cnpj,
          created_at
        `)
        .eq("company_id", profile.company_id);
  
    const companyClients =
      (allCompanyClients as ClientRecord[] | null) ?? [];
  
    const relatedClients = companyClients.filter((client) => {
      const clientPhone = onlyDigits(client.phone);
      const clientDocument = onlyDigits(client.cpf_cnpj);
  
      if (normalizedPhone && clientPhone === normalizedPhone) {
        return true;
      }
  
      if (
        normalizedDocument &&
        clientDocument === normalizedDocument
      ) {
        return true;
      }
  
      return client.id === selectedClient.id;
    });
  
    const relatedClientIds = relatedClients.map(
      (client) => client.id,
    );
  
    let appointments: AppointmentRecord[] = [];
    let appointmentsError = false;
  
    if (relatedClientIds.length > 0) {
      const { data, error } = await adminSupabase
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
          services (
            name
          )
        `)
        .eq("company_id", profile.company_id)
        .in("client_id", relatedClientIds)
        .order("appointment_date", {
          ascending: false,
        })
        .order("start_time", {
          ascending: false,
        });
  
      appointments =
        (data as AppointmentRecord[] | null) ?? [];
  
      appointmentsError = Boolean(error);
    }
  
    const confirmedAppointments = appointments.filter(
      (appointment) =>
        appointment.status === "confirmed" ||
        appointment.payment_status === "received",
    );
  
    const pendingAppointments = appointments.filter(
      (appointment) =>
        appointment.status === "pending_payment",
    );
  
    const totalConfirmedCents =
      confirmedAppointments.reduce(
        (total, appointment) =>
          total + appointment.total_amount_cents,
        0,
      );
  
    const totalDepositsReceived =
      confirmedAppointments.reduce(
        (total, appointment) =>
          total + appointment.deposit_amount_cents,
        0,
      );
  
    const today = getTodayString();
  
    const nextAppointment =
      appointments
        .filter(
          (appointment) =>
            appointment.appointment_date >= today &&
            (appointment.status === "confirmed" ||
              appointment.status === "pending_payment"),
        )
        .sort((first, second) => {
          const firstValue =
            `${first.appointment_date}-${first.start_time}`;
  
          const secondValue =
            `${second.appointment_date}-${second.start_time}`;
  
          return firstValue.localeCompare(secondValue);
        })[0] ?? null;
  
    const phoneDigits = onlyDigits(selectedClient.phone);
  
    const hasError =
      Boolean(clientsError) || appointmentsError;
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/painel/clientes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar às clientes
          </Link>
  
          <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="size-6 text-primary" />
                </div>
  
                <div>
                  <h1 className="text-3xl font-semibold">
                    {selectedClient.name}
                  </h1>
  
                  <p className="mt-1 text-muted-foreground">
                    Histórico completo da cliente
                  </p>
                </div>
              </div>
            </div>
  
            {phoneDigits ? (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  className: "gap-2",
                })}
              >
                <MessageCircle className="size-4" />
                Abrir WhatsApp
              </a>
            ) : null}
          </div>
  
          {hasError ? (
            <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar todos os dados desta
              cliente.
            </p>
          ) : null}
  
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Atendimentos confirmados
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold">
                  {confirmedAppointments.length}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Aguardando pagamento
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-amber-700">
                  {pendingAppointments.length}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Total em serviços
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(totalConfirmedCents)}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Sinais recebidos
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(totalDepositsReceived)}
                </p>
              </CardContent>
            </Card>
          </div>
  
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contato</CardTitle>
  
                  <CardDescription>
                    Dados cadastrados nos agendamentos.
                  </CardDescription>
                </CardHeader>
  
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      WhatsApp
                    </p>
  
                    <p className="font-medium">
                      {selectedClient.phone || "Não informado"}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-sm text-muted-foreground">
                      E-mail
                    </p>
  
                    <p className="font-medium">
                      {selectedClient.email || "Não informado"}
                    </p>
                  </div>
  
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Cliente desde
                    </p>
  
                    <p className="font-medium">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(
                        new Date(selectedClient.created_at),
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle>Próximo agendamento</CardTitle>
  
                  <CardDescription>
                    Próximo compromisso ativo.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  {nextAppointment ? (
                    <div className="rounded-xl border border-green-600/30 bg-green-600/10 p-4">
                      <p className="flex items-start gap-2 font-medium capitalize">
                        <CalendarDays className="mt-0.5 size-4 shrink-0" />
  
                        {formatDate(
                          nextAppointment.appointment_date,
                        )}
                      </p>
  
                      <p className="mt-2 flex items-center gap-2">
                        <Clock className="size-4" />
  
                        {formatTime(nextAppointment.start_time)}
                        {" às "}
                        {formatTime(nextAppointment.end_time)}
                      </p>
  
                      <Link
                        href={`/painel/agenda/${nextAppointment.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          className: "mt-4 w-full",
                        })}
                      >
                        Ver atendimento
                      </Link>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum próximo agendamento.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
  
            <Card>
              <CardHeader>
                <CardTitle>Histórico de atendimentos</CardTitle>
  
                <CardDescription>
                  Todos os agendamentos relacionados a esta
                  cliente.
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="py-12 text-center">
                    <CalendarDays className="mx-auto size-10 text-muted-foreground" />
  
                    <p className="mt-4 font-medium">
                      Nenhum atendimento encontrado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => {
                      const service = Array.isArray(
                        appointment.services,
                      )
                        ? appointment.services[0]
                        : appointment.services;
  
                      return (
                        <div
                          key={appointment.id}
                          className="rounded-xl border bg-background p-4"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <p className="font-semibold capitalize">
                                {formatDate(
                                  appointment.appointment_date,
                                )}
                              </p>
  
                              <p className="mt-1 flex items-center gap-2 text-sm">
                                <Clock className="size-4" />
  
                                {formatTime(
                                  appointment.start_time,
                                )}
                                {" às "}
                                {formatTime(
                                  appointment.end_time,
                                )}
                              </p>
  
                              <p className="mt-2 text-sm text-muted-foreground">
                                {service?.name ??
                                  "Serviço não identificado"}
                              </p>
                            </div>
  
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
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
  
                          <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">
                                Valor total
                              </p>
  
                              <p className="font-medium">
                                {formatCurrency(
                                  appointment.total_amount_cents,
                                )}
                              </p>
                            </div>
  
                            <div>
                              <p className="text-muted-foreground">
                                Sinal
                              </p>
  
                              <p className="font-medium">
                                {formatCurrency(
                                  appointment.deposit_amount_cents,
                                )}
                              </p>
                            </div>
  
                            <div>
                              <p className="text-muted-foreground">
                                Restante
                              </p>
  
                              <p className="font-medium">
                                {formatCurrency(
                                  appointment.remaining_amount_cents,
                                )}
                              </p>
                            </div>
                          </div>
  
                          <Link
                            href={`/painel/agenda/${appointment.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              className: "mt-4 w-full",
                            })}
                          >
                            Ver detalhes do atendimento
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }
