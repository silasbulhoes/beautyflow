import { Clock } from "lucide-react";
import { notFound } from "next/navigation";

import { PublicBookingFooter } from "@/components/public-booking-footer";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPublicClient } from "@/lib/supabase/public";

type AgendamentoPublicoPageProps = {
  params: Promise<{
    slug: string;
  }>;
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

export default async function AgendamentoPublicoPage({
  params,
}: AgendamentoPublicoPageProps) {
  const { slug } = await params;

  const supabase = createPublicClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, instagram")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (companyError || !company) {
    notFound();
  }

  const { data: services, error } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_percentage",
    )
    .eq("company_id", company.id)
    .eq("active", true)
    .order("name", {
      ascending: true,
    });

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

          {company.instagram ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Instagram: {company.instagram}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Etapa 1 de 4
          </p>

          <h2 className="mt-2 text-3xl font-semibold">
            Escolha o serviço
          </h2>

          <p className="mt-2 text-muted-foreground">
            Selecione o atendimento que deseja agendar.
          </p>
        </div>

        {error ? (
          <p className="mt-8 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Não foi possível carregar os serviços.
          </p>
        ) : null}

        {!error && services?.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <p className="font-medium">
                Nenhum serviço disponível no momento.
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Entre em contato com o estúdio para mais informações.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {services?.map((service) => {
            const depositAmount = Math.round(
              service.price_cents *
                (service.deposit_percentage / 100),
            );

            return (
              <a
                key={service.id}
                href={`/agendar/${company.slug}/servico/${service.id}`}
                className="block rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{service.name}</CardTitle>

                    <CardDescription>
                      {service.description ||
                        "Serviço disponível para agendamento."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold">
                          {formatCurrency(service.price_cents)}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Sinal de {formatCurrency(depositAmount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-4" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                    </div>

                    <div className="mt-6 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
                      Escolher serviço
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </div>
      <PublicBookingFooter />
    </main>
  );
}
