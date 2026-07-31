import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    MessageCircle,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  
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
  
  type AgendaPageProps = {
    searchParams: Promise<{
      mes?: string;
      dia?: string;
    }>;
  };
  
  type CalendarAppointment = {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string | null;
    total_amount_cents: number;
    deposit_amount_cents: number;
    remaining_amount_cents: number;
    clients:
      | {
          name: string;
          phone: string;
          email: string | null;
        }
      | Array<{
          name: string;
          phone: string;
          email: string | null;
        }>
      | null;
    services:
      | {
          name: string;
        }
      | Array<{
          name: string;
        }>
      | null;
  };
  
  const weekdayNames = [
    "Dom",
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
    "Sáb",
  ];
  
  function padNumber(value: number) {
    return String(value).padStart(2, "0");
  }
  
  function formatDateKey(
    year: number,
    month: number,
    day: number,
  ) {
    return `${year}-${padNumber(month)}-${padNumber(day)}`;
  }
  
  function isValidMonth(value: string) {
    return /^\d{4}-\d{2}$/.test(value);
  }
  
  function isValidDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
  
  function getMonthParts(value: string) {
    const [year, month] = value.split("-").map(Number);
  
    return {
      year,
      month,
    };
  }
  
  function getPreviousMonth(year: number, month: number) {
    const date = new Date(year, month - 2, 1, 12);
  
    return `${date.getFullYear()}-${padNumber(
      date.getMonth() + 1,
    )}`;
  }
  
  function getNextMonth(year: number, month: number) {
    const date = new Date(year, month, 1, 12);
  
    return `${date.getFullYear()}-${padNumber(
      date.getMonth() + 1,
    )}`;
  }
  
  function formatMonthTitle(year: number, month: number) {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1, 12));
  }
  
  function formatLongDate(value: string) {
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
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
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
  
    return "Aguardando pagamento";
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
  
    return "bg-amber-500/10 text-amber-700";
  }
  
  function getCurrentDateInformation() {
    const currentDate = new Date();
  
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
  
    return {
      monthKey: `${year}-${padNumber(month)}`,
      dateKey: formatDateKey(year, month, day),
    };
  }
  
  export default async function AgendaPage({
    searchParams,
  }: AgendaPageProps) {
    const parameters = await searchParams;
  
    const currentDateInformation =
      getCurrentDateInformation();
  
    const selectedMonth =
      typeof parameters.mes === "string" &&
      isValidMonth(parameters.mes)
        ? parameters.mes
        : currentDateInformation.monthKey;
  
    const { year, month } = getMonthParts(selectedMonth);
  
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      redirect("/painel/agenda");
    }
  
    const daysInMonth = new Date(
      year,
      month,
      0,
      12,
    ).getDate();
  
    const firstWeekday = new Date(
      year,
      month - 1,
      1,
      12,
    ).getDay();
  
    const selectedDate =
      typeof parameters.dia === "string" &&
      isValidDate(parameters.dia) &&
      parameters.dia.startsWith(`${selectedMonth}-`)
        ? parameters.dia
        : null;
  
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
  
    const monthStart = `${selectedMonth}-01`;
  
    const monthEnd = formatDateKey(
      year,
      month,
      daysInMonth,
    );
  
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
      .gte("appointment_date", monthStart)
      .lte("appointment_date", monthEnd)
      .in("status", ["pending_payment", "confirmed"])
      .order("appointment_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });
  
    const appointments =
      (data as CalendarAppointment[] | null) ?? [];
  
    const appointmentsByDate = new Map<
      string,
      CalendarAppointment[]
    >();
  
    for (const appointment of appointments) {
      const dateAppointments =
        appointmentsByDate.get(
          appointment.appointment_date,
        ) ?? [];
  
      dateAppointments.push(appointment);
  
      appointmentsByDate.set(
        appointment.appointment_date,
        dateAppointments,
      );
    }
  
    const selectedDayAppointments = selectedDate
      ? appointmentsByDate.get(selectedDate) ?? []
      : [];
  
    const confirmedCount = appointments.filter(
      (appointment) =>
        appointment.status === "confirmed" ||
        appointment.payment_status === "received",
    ).length;
  
    const pendingCount = appointments.filter(
      (appointment) =>
        appointment.status === "pending_payment",
    ).length;
  
    const previousMonth = getPreviousMonth(year, month);
    const nextMonth = getNextMonth(year, month);
  
    const calendarCells: Array<number | null> = [];
  
    for (
      let index = 0;
      index < firstWeekday;
      index += 1
    ) {
      calendarCells.push(null);
    }
  
    for (let day = 1; day <= daysInMonth; day += 1) {
      calendarCells.push(day);
    }
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div>
            <Link
              href="/painel"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar ao painel
            </Link>
  
            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-3xl font-semibold">
                  Agenda
                </h1>
  
                <p className="mt-2 text-muted-foreground">
                  Consulte seus atendimentos confirmados e
                  aguardando pagamento.
                </p>
              </div>
  
              <div className="flex gap-3 text-sm">
                <div className="rounded-lg border bg-background px-4 py-2">
                  <p className="text-muted-foreground">
                    Confirmados
                  </p>
  
                  <p className="text-lg font-semibold text-green-700">
                    {confirmedCount}
                  </p>
                </div>
  
                <div className="rounded-lg border bg-background px-4 py-2">
                  <p className="text-muted-foreground">
                    Pendentes
                  </p>
  
                  <p className="text-lg font-semibold text-amber-700">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {error ? (
            <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar os agendamentos.
            </p>
          ) : null}
  
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/painel/agenda?mes=${previousMonth}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "icon",
                    })}
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
  
                  <div className="text-center">
                    <CardTitle className="capitalize">
                      {formatMonthTitle(year, month)}
                    </CardTitle>
  
                    <CardDescription>
                      Clique em um dia para ver os
                      atendimentos.
                    </CardDescription>
                  </div>
  
                  <Link
                    href={`/painel/agenda?mes=${nextMonth}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "icon",
                    })}
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </CardHeader>
  
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground sm:gap-2">
                  {weekdayNames.map((weekday) => (
                    <div key={weekday} className="py-2">
                      {weekday}
                    </div>
                  ))}
                </div>
  
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarCells.map((day, index) => {
                    if (day === null) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="aspect-square"
                        />
                      );
                    }
  
                    const dateKey = formatDateKey(
                      year,
                      month,
                      day,
                    );
  
                    const dayAppointments =
                      appointmentsByDate.get(dateKey) ?? [];
  
                    const hasConfirmed =
                      dayAppointments.some(
                        (appointment) =>
                          appointment.status ===
                            "confirmed" ||
                          appointment.payment_status ===
                            "received",
                      );
  
                    const hasPending =
                      dayAppointments.some(
                        (appointment) =>
                          appointment.status ===
                          "pending_payment",
                      );
  
                    const isSelected =
                      selectedDate === dateKey;
  
                    const isToday =
                      currentDateInformation.dateKey ===
                      dateKey;
  
                    let dayClass =
                      "border bg-background hover:bg-muted";
  
                    if (hasConfirmed) {
                      dayClass =
                        "border-green-600/30 bg-green-600/10 hover:bg-green-600/15";
                    } else if (hasPending) {
                      dayClass =
                        "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15";
                    }
  
                    if (isSelected) {
                      dayClass +=
                        " ring-2 ring-primary ring-offset-2";
                    }
  
                    return (
                      <Link
                        key={dateKey}
                        href={`/painel/agenda?mes=${selectedMonth}&dia=${dateKey}`}
                        className={`relative flex aspect-square min-h-12 flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${dayClass}`}
                      >
                        <span
                          className={
                            isToday
                              ? "flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                              : "text-xs font-medium sm:text-sm"
                          }
                        >
                          {day}
                        </span>
  
                        {dayAppointments.length > 0 ? (
                          <div className="mt-auto">
                            <p className="hidden text-xs font-medium sm:block">
                              {dayAppointments.length}{" "}
                              {dayAppointments.length === 1
                                ? "cliente"
                                : "clientes"}
                            </p>
  
                            <div className="mt-1 flex gap-1">
                              {hasConfirmed ? (
                                <span className="size-2 rounded-full bg-green-600" />
                              ) : null}
  
                              {hasPending ? (
                                <span className="size-2 rounded-full bg-amber-500" />
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
  
                <div className="mt-6 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-green-600" />
                    Confirmado
                  </span>
  
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-amber-500" />
                    Aguardando pagamento
                  </span>
  
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-muted-foreground/30" />
                    Sem atendimento
                  </span>
                </div>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
  
                  {selectedDate
                    ? formatLongDate(selectedDate)
                    : "Selecione um dia"}
                </CardTitle>
  
                <CardDescription>
                  {selectedDate
                    ? `${selectedDayAppointments.length} atendimento(s) nesse dia.`
                    : "Clique em uma data do calendário."}
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                {!selectedDate ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Escolha um dia para consultar as clientes e
                    os horários.
                  </div>
                ) : null}
  
                {selectedDate &&
                selectedDayAppointments.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="font-medium">
                      Nenhum atendimento neste dia.
                    </p>
  
                    <p className="mt-2 text-sm text-muted-foreground">
                      Os horários estão livres.
                    </p>
                  </div>
                ) : null}
  
                <div className="space-y-4">
                  {selectedDayAppointments.map(
                    (appointment) => {
                      const client = Array.isArray(
                        appointment.clients,
                      )
                        ? appointment.clients[0]
                        : appointment.clients;
  
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
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-2 text-lg font-semibold">
                                <Clock className="size-4" />
  
                                {formatTime(
                                  appointment.start_time,
                                )}
                                {" às "}
                                {formatTime(
                                  appointment.end_time,
                                )}
                              </p>
  
                              <p className="mt-1 font-medium">
                                {client?.name ??
                                  "Cliente não identificada"}
                              </p>
  
                              <p className="text-sm text-muted-foreground">
                                {service?.name ??
                                  "Serviço não identificado"}
                              </p>
                            </div>
  
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
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
                              className: "mt-4 w-full",
                            })}
                          >
                            Ver detalhes
                          </Link>
  
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
                                className:
                                  "mt-3 w-full gap-2",
                              })}
                            >
                              <MessageCircle className="size-4" />
                              Abrir WhatsApp
                            </a>
                          ) : null}
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }