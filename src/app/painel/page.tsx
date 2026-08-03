import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Scissors,
  UsersRound,
  WalletCards,
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

type AppointmentRelation<T> = T | T[] | null;

type DashboardAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string | null;
  deposit_amount_cents: number;
  clients: AppointmentRelation<{
    name: string;
    phone: string;
  }>;
  services: AppointmentRelation<{
    name: string;
  }>;
};

type ReceivedPayment = {
  deposit_amount_cents: number | null;
};

const brazilTimeZone = "America/Sao_Paulo";

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

function getCurrentBrazilDateTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: brazilTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);
  const minute = Number(values.minute);

  return {
    year,
    month,
    day,
    hour,
    dateKey: `${year}-${padNumber(month)}-${padNumber(
      day,
    )}`,
    timeKey: `${padNumber(hour)}:${padNumber(minute)}`,
  };
}

function addDaysToDateKey(
  dateKey: string,
  numberOfDays: number,
) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day + numberOfDays, 12),
  );

  return [
    date.getUTCFullYear(),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join("-");
}

function getNextMonthStart(
  year: number,
  month: number,
) {
  const date = new Date(
    Date.UTC(year, month, 1, 12),
  );

  return `${date.getUTCFullYear()}-${padNumber(
    date.getUTCMonth() + 1,
  )}-01`;
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

function formatAppointmentDate(
  value: string,
  todayKey: string,
) {
  if (value === todayKey) {
    return "Hoje";
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: brazilTimeZone,
  }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function formatMonthName(
  year: number,
  month: number,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: brazilTimeZone,
  }).format(
    new Date(Date.UTC(year, month - 1, 1, 12)),
  );
}

function getGreeting(hour: number) {
  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
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

  return "Aguardando sinal";
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

export default async function PainelPage() {
  const authenticatedSupabase = await createClient();

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

  const name =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "Profissional";

  if (!profile?.company_id) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <CardTitle>
                Empresa não encontrada
              </CardTitle>

              <CardDescription>
                Seu usuário ainda não está vinculado a
                uma empresa no BeautyFlow.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  const currentDateTime =
    getCurrentBrazilDateTime();

  const todayKey = currentDateTime.dateKey;
  const sevenDaysEnd = addDaysToDateKey(
    todayKey,
    6,
  );

  const monthStart = `${currentDateTime.year}-${padNumber(
    currentDateTime.month,
  )}-01`;

  const nextMonthStart = getNextMonthStart(
    currentDateTime.year,
    currentDateTime.month,
  );

  const adminSupabase = createAdminClient();

  const [
    todayResult,
    weekResult,
    pendingResult,
    upcomingResult,
    receivedResult,
  ] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", profile.company_id)
      .eq("appointment_date", todayKey)
      .in("status", [
        "pending_payment",
        "confirmed",
      ]),

    adminSupabase
      .from("appointments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", profile.company_id)
      .gte("appointment_date", todayKey)
      .lte("appointment_date", sevenDaysEnd)
      .in("status", [
        "pending_payment",
        "confirmed",
      ]),

    adminSupabase
      .from("appointments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", profile.company_id)
      .gte("appointment_date", todayKey)
      .eq("status", "pending_payment"),

    adminSupabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        payment_status,
        deposit_amount_cents,
        clients (
          name,
          phone
        ),
        services (
          name
        )
      `)
      .eq("company_id", profile.company_id)
      .gte("appointment_date", todayKey)
      .in("status", [
        "pending_payment",
        "confirmed",
      ])
      .order("appointment_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      })
      .limit(30),

    adminSupabase
      .from("appointments")
      .select("deposit_amount_cents")
      .eq("company_id", profile.company_id)
      .eq("payment_status", "received")
      .gte("paid_at", monthStart)
      .lt("paid_at", nextMonthStart),
  ]);

  const upcomingAppointments =
    (upcomingResult.data as
      | DashboardAppointment[]
      | null) ?? [];

  const nextAppointments = upcomingAppointments
    .filter((appointment) => {
      if (appointment.appointment_date > todayKey) {
        return true;
      }

      if (appointment.appointment_date < todayKey) {
        return false;
      }

      return (
        formatTime(appointment.start_time) >=
        currentDateTime.timeKey
      );
    })
    .slice(0, 5);

  const receivedPayments =
    (receivedResult.data as
      | ReceivedPayment[]
      | null) ?? [];

  const receivedAmountInCents =
    receivedPayments.reduce(
      (total, payment) =>
        total +
        Number(payment.deposit_amount_cents ?? 0),
      0,
    );

  const hasDashboardError = Boolean(
    todayResult.error ||
      weekResult.error ||
      pendingResult.error ||
      upcomingResult.error ||
      receivedResult.error,
  );

  const monthName = formatMonthName(
    currentDateTime.year,
    currentDateTime.month,
  );

  const todayAgendaUrl =
    `/painel/agenda?mes=${todayKey.slice(
      0,
      7,
    )}&dia=${todayKey}`;

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold">
              {getGreeting(currentDateTime.hour)},{" "}
              {name}
            </h1>

            <p className="mt-2 text-muted-foreground">
              Veja o resumo da sua agenda e dos sinais
              recebidos.
            </p>
          </div>

          <Link
            href={todayAgendaUrl}
            className={buttonVariants({
              variant: "outline",
              className:
                "w-full gap-2 sm:w-auto",
            })}
          >
            <CalendarDays className="size-4" />
            Ver agenda de hoje
          </Link>
        </div>

        {hasDashboardError ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
            Alguns indicadores não puderam ser
            carregados. Atualize a página para tentar
            novamente.
          </div>
        ) : null}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm font-medium">
                Atendimentos hoje
              </CardTitle>

              <CalendarCheck2 className="size-5 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {todayResult.count ?? 0}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Confirmados e aguardando sinal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximos 7 dias
              </CardTitle>

              <Clock3 className="size-5 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {weekResult.count ?? 0}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Atendimentos programados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm font-medium">
                Recebido no mês
              </CardTitle>

              <CircleDollarSign className="size-5 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold text-green-700">
                {formatCurrency(
                  receivedAmountInCents,
                )}
              </p>

              <p className="mt-1 text-xs capitalize text-muted-foreground">
                Sinais confirmados em {monthName}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="text-sm font-medium">
                Pagamentos pendentes
              </CardTitle>

              <CreditCard className="size-5 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold text-amber-700">
                {pendingResult.count ?? 0}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Horários aguardando sinal
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    Próximos atendimentos
                  </CardTitle>

                  <CardDescription className="mt-1">
                    Os cinco atendimentos mais próximos
                    da sua agenda.
                  </CardDescription>
                </div>

                <Link
                  href="/painel/agenda"
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  Ver agenda
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {nextAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-12 text-center">
                  <CalendarDays className="mx-auto size-10 text-muted-foreground" />

                  <p className="mt-4 font-medium">
                    Nenhum atendimento próximo
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Os novos agendamentos aparecerão
                    aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nextAppointments.map(
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
                          className="group flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <span className="text-sm font-semibold">
                                {formatTime(
                                  appointment.start_time,
                                )}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium capitalize">
                                {formatAppointmentDate(
                                  appointment.appointment_date,
                                  todayKey,
                                )}
                                {" · "}
                                {formatTime(
                                  appointment.start_time,
                                )}
                                {" às "}
                                {formatTime(
                                  appointment.end_time,
                                )}
                              </p>

                              <p className="mt-1 truncate text-sm">
                                {client?.name ??
                                  "Cliente não identificada"}
                              </p>

                              <p className="truncate text-sm text-muted-foreground">
                                {service?.name ??
                                  "Serviço"}
                                {" · Sinal "}
                                {formatCurrency(
                                  appointment.deposit_amount_cents,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
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

                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                          </div>
                        </Link>
                      );
                    },
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acessos rápidos</CardTitle>

              <CardDescription>
                Abra as áreas mais usadas do sistema.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <Link
                href="/painel/agenda"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "w-full justify-start gap-3",
                })}
              >
                <CalendarDays className="size-4" />
                Abrir agenda
              </Link>

              <Link
                href="/painel/clientes"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "w-full justify-start gap-3",
                })}
              >
                <UsersRound className="size-4" />
                Consultar clientes
              </Link>

              <Link
                href="/painel/servicos"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "w-full justify-start gap-3",
                })}
              >
                <Scissors className="size-4" />
                Gerenciar serviços
              </Link>

              <Link
                href="/painel/financeiro"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "w-full justify-start gap-3",
                })}
              >
                <WalletCards className="size-4" />
                Abrir financeiro
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}