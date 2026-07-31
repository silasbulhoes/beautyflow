import {
    CalendarDays,
    Clock,
    CreditCard,
  } from "lucide-react";
  import Link from "next/link";
  import { notFound, redirect } from "next/navigation";
  
  import { RescheduleForm } from "./reschedule-form";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type ReschedulePageProps = {
    params: Promise<{
      appointmentId: string;
    }>;
    searchParams: Promise<{
      data?: string;
    }>;
  };
  
  function isValidDateString(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
  
  function parseLocalDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
  
    return new Date(year, month - 1, day, 12);
  }
  
  function getTodayString() {
    const today = new Date();
  
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(
      2,
      "0",
    );
    const day = String(today.getDate()).padStart(2, "0");
  
    return `${year}-${month}-${day}`;
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
  
  function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueInCents / 100);
  }
  
  export default async function ReschedulePage({
    params,
    searchParams,
  }: ReschedulePageProps) {
    const { appointmentId } = await params;
    const parameters = await searchParams;
  
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
        company_id,
        appointment_date,
        start_time,
        end_time,
        status,
        payment_status,
        deposit_amount_cents,
        clients (
          name
        ),
        services (
          name
        )
      `)
      .eq("id", appointmentId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
  
    if (!appointment) {
      notFound();
    }
  
    if (
      appointment.status !== "confirmed" &&
      appointment.status !== "pending_payment"
    ) {
      redirect(`/painel/agenda/${appointment.id}`);
    }
  
    const client = Array.isArray(appointment.clients)
      ? appointment.clients[0]
      : appointment.clients;
  
    const service = Array.isArray(appointment.services)
      ? appointment.services[0]
      : appointment.services;
  
    const selectedDate =
      typeof parameters.data === "string" &&
      isValidDateString(parameters.data)
        ? parameters.data
        : null;
  
    let schedules: Array<{
      id: string;
      start_time: string;
      end_time: string;
    }> = [];
  
    let scheduleError = false;
  
    if (selectedDate) {
      const parsedDate = parseLocalDate(selectedDate);
  
      if (!Number.isNaN(parsedDate.getTime())) {
        const weekday = parsedDate.getDay();
  
        await adminSupabase
          .from("appointments")
          .update({
            status: "expired",
            payment_status: "expired",
          })
          .eq("company_id", profile.company_id)
          .eq("appointment_date", selectedDate)
          .eq("status", "pending_payment")
          .neq("id", appointment.id)
          .lt("expires_at", new Date().toISOString());
  
        const { data: configuredSchedules, error } =
          await adminSupabase
            .from("business_hours")
            .select("id, start_time, end_time")
            .eq("company_id", profile.company_id)
            .eq("weekday", weekday)
            .eq("active", true)
            .order("start_time", {
              ascending: true,
            });
  
        if (error) {
          scheduleError = true;
        } else {
          const { data: occupiedAppointments } =
            await adminSupabase
              .from("appointments")
              .select("business_hour_id")
              .eq("company_id", profile.company_id)
              .eq("appointment_date", selectedDate)
              .in("status", [
                "pending_payment",
                "confirmed",
              ])
              .neq("id", appointment.id);
  
          const occupiedScheduleIds = new Set(
            occupiedAppointments
              ?.map(
                (occupiedAppointment) =>
                  occupiedAppointment.business_hour_id,
              )
              .filter(
                (scheduleId): scheduleId is string =>
                  typeof scheduleId === "string",
              ) ?? [],
          );
  
          schedules =
            configuredSchedules?.filter(
              (schedule) =>
                !occupiedScheduleIds.has(schedule.id),
            ) ?? [];
        }
      }
    }
  
    const paymentWasReceived =
      appointment.payment_status === "received";
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/painel/agenda/${appointment.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar aos detalhes
          </Link>
  
          <div className="mt-5">
            <h1 className="text-3xl font-semibold">
              Remarcar atendimento
            </h1>
  
            <p className="mt-2 text-muted-foreground">
              Escolha uma nova data e um horário disponível.
            </p>
          </div>
  
          {paymentWasReceived ? (
            <div className="mt-6 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-5 text-green-700" />
  
                <div>
                  <p className="font-medium text-green-700">
                    Sinal já confirmado
                  </p>
  
                  <p className="mt-1 text-sm text-muted-foreground">
                    A remarcação manterá o pagamento de{" "}
                    {formatCurrency(
                      appointment.deposit_amount_cents,
                    )}{" "}
                    confirmado.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
  
          <div className="mt-6 grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Atendimento atual</CardTitle>
  
                <CardDescription>
                  Dados antes da remarcação.
                </CardDescription>
              </CardHeader>
  
              <CardContent className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cliente
                  </p>
  
                  <p className="font-medium">
                    {client?.name ?? "Cliente"}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Serviço
                  </p>
  
                  <p className="font-medium">
                    {service?.name ?? "Serviço"}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Data atual
                  </p>
  
                  <p className="flex items-start gap-2 font-medium capitalize">
                    <CalendarDays className="mt-0.5 size-4" />
                    {formatDate(appointment.appointment_date)}
                  </p>
                </div>
  
                <div>
                  <p className="text-sm text-muted-foreground">
                    Horário atual
                  </p>
  
                  <p className="flex items-center gap-2 font-medium">
                    <Clock className="size-4" />
                    {formatTime(appointment.start_time)}
                    {" às "}
                    {formatTime(appointment.end_time)}
                  </p>
                </div>
              </CardContent>
            </Card>
  
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Nova data</CardTitle>
  
                  <CardDescription>
                    Selecione o novo dia do atendimento.
                  </CardDescription>
                </CardHeader>
  
                <CardContent>
                  <form
                    method="get"
                    className="flex flex-col gap-4 sm:flex-row sm:items-end"
                  >
                    <div className="w-full space-y-2">
                      <Label htmlFor="data">
                        Escolha a data
                      </Label>
  
                      <Input
                        id="data"
                        name="data"
                        type="date"
                        min={getTodayString()}
                        defaultValue={selectedDate ?? ""}
                        required
                      />
                    </div>
  
                    <button
                      type="submit"
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Ver horários
                    </button>
                  </form>
                </CardContent>
              </Card>
  
              {selectedDate ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {formatDate(selectedDate)}
                    </CardTitle>
  
                    <CardDescription>
                      Selecione o novo horário.
                    </CardDescription>
                  </CardHeader>
  
                  <CardContent>
                    {scheduleError ? (
                      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Não foi possível carregar os horários.
                      </p>
                    ) : (
                      <RescheduleForm
                        appointmentId={appointment.id}
                        appointmentDate={selectedDate}
                        schedules={schedules}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    );
  }