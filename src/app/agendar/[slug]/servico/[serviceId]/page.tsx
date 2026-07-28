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
import { createPublicClient } from "@/lib/supabase/public";

type EscolherHorarioPageProps = {
  params: Promise<{
    slug: string;
    serviceId: string;
  }>;
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

export default async function EscolherHorarioPage({
  params,
}: EscolherHorarioPageProps) {
  const { slug, serviceId } = await params;

  const supabase = createPublicClient();

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

  const { data: schedules, error } = await supabase
    .from("business_hours")
    .select("id, weekday, start_time, end_time")
    .eq("company_id", company.id)
    .eq("active", true)
    .order("weekday", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  const schedulesByWeekday = Array.from(
    { length: 7 },
    (_, weekday) => ({
      weekday,
      schedules:
        schedules?.filter(
          (schedule) => schedule.weekday === weekday,
        ) ?? [],
    }),
  ).filter((day) => day.schedules.length > 0);

  const depositAmount = Math.round(
    service.price_cents * (service.deposit_percentage / 100),
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
            Escolha o horário
          </h2>

          <p className="mt-2 text-muted-foreground">
            Selecione um dos períodos disponíveis para continuar.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{service.name}</CardTitle>

            <CardDescription>
              {service.description || "Serviço selecionado."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Preço</p>
                <p className="font-medium">
                  {formatCurrency(service.price_cents)}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Duração</p>
                <p className="font-medium">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Sinal</p>
                <p className="font-medium">
                  {formatCurrency(depositAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <p className="mt-8 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Não foi possível carregar os horários.
          </p>
        ) : null}

        {!error && schedulesByWeekday.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <p className="font-medium">
                Nenhum horário disponível no momento.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-8 space-y-5">
          {schedulesByWeekday.map(({ weekday, schedules: daySchedules }) => (
            <Card key={weekday}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  {weekdayNames[weekday]}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {daySchedules.map((schedule) => (
                    <Link
                      key={schedule.id}
                      href={`/agendar/${company.slug}/servico/${service.id}/confirmar?horario=${schedule.id}`}
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}