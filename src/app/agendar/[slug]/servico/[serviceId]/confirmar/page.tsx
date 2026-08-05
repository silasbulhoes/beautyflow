import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicBookingFooter } from "@/components/public-booking-footer";

import { ConfirmationForm } from "./confirmation-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPublicClient } from "@/lib/supabase/public";

type ConfirmarPageProps = {
  params: Promise<{
    slug: string;
    serviceId: string;
  }>;
  searchParams: Promise<{
    horario?: string;
    data?: string;
  }>;
};


function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parseLocalDate(value));
}

export default async function ConfirmarPage({
  params,
  searchParams,
}: ConfirmarPageProps) {
  const { slug, serviceId } = await params;
  const { horario, data } = await searchParams;

  if (
    typeof horario !== "string" ||
    typeof data !== "string" ||
    !isValidDateString(data)
  ) {
    notFound();
  }

  const selectedDate = parseLocalDate(data);

  if (Number.isNaN(selectedDate.getTime())) {
    notFound();
  }

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
      "id, name, description, price_cents, deposit_percentage",
    )
    .eq("id", serviceId)
    .eq("company_id", company.id)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    notFound();
  }

  const { data: schedule } = await supabase
    .from("business_hours")
    .select("id, weekday, start_time, end_time")
    .eq("id", horario)
    .eq("company_id", company.id)
    .eq("active", true)
    .maybeSingle();

  if (!schedule) {
    notFound();
  }

  if (selectedDate.getDay() !== schedule.weekday) {
    notFound();
  }

  const depositAmount = Math.round(
    service.price_cents * (service.deposit_percentage / 100),
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-sm font-medium text-muted-foreground">
            Agendamento online
          </p>

          <h1 className="mt-1 text-2xl font-semibold">
            {company.name}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/agendar/${slug}/servico/${serviceId}?data=${data}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar aos horários
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Etapa 3 de 4
          </p>

          <h2 className="mt-2 text-3xl font-semibold">
            Confirme seus dados
          </h2>

          <p className="mt-2 text-muted-foreground">
            Confira a data e o horário e informe seus dados.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>

              <CardDescription>
                {service.description || "Serviço selecionado."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Data
                </p>

                <p className="mt-1 flex items-start gap-2 font-medium">
                  <CalendarDays className="mt-0.5 size-4 shrink-0" />
                  <span className="capitalize">
                    {formatDate(data)}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Horário
                </p>

                <p className="mt-1 flex items-center gap-2 font-medium">
                  <Clock className="size-4" />
                  {formatTime(schedule.start_time)}
                  {" às "}
                  {formatTime(schedule.end_time)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Valor total
                </p>

                <p className="font-medium">
                  {formatCurrency(service.price_cents)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Sinal para reservar
                </p>

                <p className="font-medium">
                  {formatCurrency(depositAmount)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados da cliente</CardTitle>

              <CardDescription>
                O WhatsApp será usado para a confirmação.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ConfirmationForm
                slug={slug}
                serviceId={serviceId}
                scheduleId={schedule.id}
                appointmentDate={data}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <PublicBookingFooter />
    </main>
  );
}
