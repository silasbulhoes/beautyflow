import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

type ConfirmadoPageProps = {
  params: Promise<{
    slug: string;
    appointmentId: string;
  }>;
};

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

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

export default async function ConfirmadoPage({
  params,
}: ConfirmadoPageProps) {
  const { slug, appointmentId } = await params;

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

  const { data: appointment } = await supabase
    .from("appointments")
    .select(`
      id,
      status,
      appointment_date,
      start_time,
      end_time,
      services (
        name
      )
    `)
    .eq("id", appointmentId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!appointment || appointment.status !== "confirmed") {
    notFound();
  }

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

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
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto size-14 text-green-700" />

            <CardTitle className="mt-4 text-2xl">
              Agendamento confirmado
            </CardTitle>

            <CardDescription>
              Seu horário foi reservado com sucesso.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/40 p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Serviço
              </p>

              <p className="mt-1 font-medium">
                {service?.name ?? "Serviço"}
              </p>

              <p className="mt-4 text-sm text-muted-foreground capitalize">
                {formatDate(appointment.appointment_date)}
              </p>

              <p className="mt-1 font-medium">
                {formatTime(appointment.start_time)}
                {" às "}
                {formatTime(appointment.end_time)}
              </p>
            </div>

            <Link
              href={`/agendar/${slug}`}
              className={buttonVariants({
                className: "w-full",
              })}
            >
              Voltar ao perfil de {company.name}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
