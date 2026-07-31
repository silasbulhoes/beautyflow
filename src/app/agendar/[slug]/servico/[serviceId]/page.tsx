import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

type EscolherHorarioPageProps = {
  params: Promise<{
    slug: string;
    serviceId: string;
  }>;
  searchParams: Promise<{
    data?: string;
  }>;
};

type Schedule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

const weekdayNames: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSelectedDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

async function getCurrentTime() {
  return new Date().toISOString();
}

export default async function EscolherHorarioPage({
  params,
  searchParams,
}: EscolherHorarioPageProps) {
  const { slug, serviceId } = await params;
  const { data: selectedDateParam } = await searchParams;

  const selectedDate =
    typeof selectedDateParam === "string" &&
    isValidDateString(selectedDateParam)
      ? selectedDateParam
      : null;

  /*
   * Esta página roda no servidor.
   * O cliente administrativo permite consultar os agendamentos
   * sem liberar dados particulares pela política pública do banco.
   */
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const { data: service } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_percentage",
    )
    .eq("id", serviceId)
    .eq("company_id", company.id)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    notFound();
  }

  let schedules: Schedule[] = [];
  let scheduleError = false;
  let selectedWeekday: number | null = null;

  if (selectedDate) {
    const [year, month, day] = selectedDate
      .split("-")
      .map(Number);

    const parsedDate = new Date(
      year,
      month - 1,
      day,
      12,
    );

    selectedWeekday = parsedDate.getDay();

    const currentTime = await getCurrentTime();

    /*
     * Libera horários cujo prazo para pagamento já terminou.
     */
    const { error: expirationError } = await supabase
      .from("appointments")
      .update({
        status: "expired",
        payment_status: "expired",
      })
      .eq("company_id", company.id)
      .eq("appointment_date", selectedDate)
      .eq("status", "pending_payment")
      .lt("expires_at", currentTime);

    if (expirationError) {
      console.error(
        "Erro ao expirar reservas antigas:",
        expirationError,
      );
    }

    const { data: configuredSchedules, error } =
      await supabase
        .from("business_hours")
        .select("id, weekday, start_time, end_time")
        .eq("company_id", company.id)
        .eq("weekday", selectedWeekday)
        .eq("active", true)
        .order("start_time", {
          ascending: true,
        });

    if (error) {
      scheduleError = true;
    } else {
      const { data: occupiedAppointments, error: occupiedError } =
        await supabase
          .from("appointments")
          .select("business_hour_id")
          .eq("company_id", company.id)
          .eq("appointment_date", selectedDate)
          .in("status", [
            "pending_payment",
            "confirmed",
          ]);

      if (occupiedError) {
        console.error(
          "Erro ao consultar horários ocupados:",
          occupiedError,
        );

        scheduleError = true;
      } else {
        const occupiedScheduleIds = new Set(
          occupiedAppointments
            ?.map(
              (appointment) =>
                appointment.business_hour_id,
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

  const depositAmount = Math.round(
    service.price_cents *
      (service.deposit_percentage / 100),
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <p className="text-sm font-medium text-muted-foreground">
            Agendamento online
          </p>

          <h1 className="mt-1 text-2xl font-semibold">
            {company.name}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={`/agendar/${company.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar aos serviços
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Etapa 2 de 4
          </p>

          <h2 className="mt-2 text-3xl font-semibold">
            Escolha a data e o horário
          </h2>

          <p className="mt-2 text-muted-foreground">
            Primeiro escolha o dia. Depois serão mostrados apenas os
            horários disponíveis.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{service.name}</CardTitle>

            <CardDescription>
              {service.description ||
                "Serviço selecionado."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">
                  Preço
                </p>

                <p className="font-medium">
                  {formatCurrency(service.price_cents)}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Duração
                </p>

                <p className="font-medium">
                  {formatDuration(
                    service.duration_minutes,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Sinal
                </p>

                <p className="font-medium">
                  {formatCurrency(depositAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Data do atendimento
            </CardTitle>

            <CardDescription>
              Selecione a data em que deseja ser atendida.
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
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                Ver horários
              </button>
            </form>
          </CardContent>
        </Card>

        {selectedDate ? (
          <section className="mt-8">
            <div>
              <h3 className="text-xl font-semibold">
                Horários para{" "}
                {formatSelectedDate(selectedDate)}
              </h3>

              {selectedWeekday !== null ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Dia configurado:{" "}
                  {weekdayNames[selectedWeekday]}
                </p>
              ) : null}
            </div>

            {scheduleError ? (
              <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Não foi possível carregar os horários.
              </p>
            ) : null}

            {!scheduleError &&
            schedules.length === 0 ? (
              <Card className="mt-5">
                <CardContent className="py-10 text-center">
                  <p className="font-medium">
                    Nenhum horário disponível para essa
                    data.
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Os horários podem estar ocupados ou não
                    haver atendimento nesse dia. Escolha
                    outra data.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {schedules.map((schedule) => (
                <Link
                  key={schedule.id}
                  href={`/agendar/${company.slug}/servico/${service.id}/confirmar?data=${selectedDate}&horario=${schedule.id}`}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-4 transition-colors hover:bg-muted"
                >
                  <span className="font-medium">
                    {formatTime(schedule.start_time)}
                    {" às "}
                    {formatTime(schedule.end_time)}
                  </span>

                  <Clock className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}