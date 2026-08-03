import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

import { PaymentButton } from "./payment-button";
import { SandboxPaymentButton } from "./sandbox-payment-button";

type PagamentoPageProps = {
  params: Promise<{
    slug: string;
    appointmentId: string;
  }>;
  searchParams: Promise<{
    resultado?: string;
  }>;
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

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

export default async function PagamentoPage({
  params,
  searchParams,
}: PagamentoPageProps) {
  const { slug, appointmentId } = await params;
  const { resultado } = await searchParams;

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
      appointment_date,
      start_time,
      end_time,
      status,
      total_amount_cents,
      deposit_amount_cents,
      remaining_amount_cents,
      expires_at,
      payment_status,
      asaas_checkout_url,
      asaas_checkout_id,
      asaas_payment_id,
      clients (
        name,
        phone,
        email
      ),
      services (
        name,
        description
      )
    `)
    .eq("id", appointmentId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!appointment) {
    notFound();
  }

  const client = Array.isArray(appointment.clients)
    ? appointment.clients[0]
    : appointment.clients;

  const service = Array.isArray(appointment.services)
    ? appointment.services[0]
    : appointment.services;

  const isConfirmed =
    appointment.status === "confirmed" ||
    appointment.payment_status === "confirmed" ||
    appointment.payment_status === "received";

  const isExpired =
    appointment.status === "expired" ||
    appointment.payment_status === "expired";

  const paymentWasCancelled =
    resultado === "cancelado";

  const paymentReturnedAsExpired =
    resultado === "expirado";

  const paymentReturnedAsSuccess =
    resultado === "sucesso";

  const isAsaasSandbox =
    process.env.ASAAS_API_URL?.includes(
      "api-sandbox.asaas.com",
    ) ?? false;

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
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Etapa 4 de 4
          </p>

          <h2 className="mt-2 text-3xl font-semibold">
            Pagamento do sinal
          </h2>

          <p className="mt-2 text-muted-foreground">
            Confira o resumo e pague o sinal para confirmar
            o horário.
          </p>
        </div>

        {paymentWasCancelled ? (
          <div className="mt-6 rounded-xl border border-amber-600/30 bg-amber-600/10 p-4">
            <p className="font-medium">
              Pagamento cancelado
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Nenhum pagamento foi confirmado. Você pode
              tentar novamente.
            </p>
          </div>
        ) : null}

        {paymentReturnedAsExpired ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p className="font-medium">
              Checkout expirado
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              O prazo para concluir esse pagamento terminou.
            </p>
          </div>
        ) : null}

        {paymentReturnedAsSuccess && !isConfirmed ? (
          <div className="mt-6 rounded-xl border border-blue-600/30 bg-blue-600/10 p-4">
            <p className="font-medium">
              Pagamento enviado
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Estamos aguardando a confirmação do Asaas.
              Esta página será atualizada quando o pagamento
              for confirmado.
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>
                Resumo do agendamento
              </CardTitle>

              <CardDescription>
                Confira os dados antes de pagar.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
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
                  Cliente
                </p>

                <p className="font-medium">
                  {client?.name ?? "Cliente"}
                </p>

                <p className="text-sm text-muted-foreground">
                  {client?.phone}
                </p>

                {client?.email ? (
                  <p className="text-sm text-muted-foreground">
                    {client.email}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Data
                </p>

                <p className="mt-1 flex items-start gap-2 font-medium capitalize">
                  <CalendarDays className="mt-0.5 size-4 shrink-0" />

                  {formatDate(
                    appointment.appointment_date,
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Horário
                </p>

                <p className="mt-1 flex items-center gap-2 font-medium">
                  <Clock className="size-4" />

                  {formatTime(appointment.start_time)}
                  {" às "}
                  {formatTime(appointment.end_time)}
                </p>
              </div>

              <div className="border-t pt-5">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Valor total
                  </span>

                  <span className="font-medium">
                    {formatCurrency(
                      appointment.total_amount_cents,
                    )}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Sinal agora
                  </span>

                  <span className="text-lg font-semibold">
                    {formatCurrency(
                      appointment.deposit_amount_cents,
                    )}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Restante no atendimento
                  </span>

                  <span className="font-medium">
                    {formatCurrency(
                      appointment.remaining_amount_cents,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {isConfirmed
                  ? "Pagamento confirmado"
                  : isExpired
                    ? "Reserva expirada"
                    : "Pague o sinal"}
              </CardTitle>

              <CardDescription>
                {isConfirmed
                  ? "Seu horário está confirmado."
                  : isExpired
                    ? "O tempo para concluir o pagamento terminou."
                    : "Escolha Pix ou cartão na página segura do Asaas."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isConfirmed ? (
                <div className="rounded-xl border border-green-600/30 bg-green-600/10 p-6 text-center">
                  <CheckCircle2 className="mx-auto size-12 text-green-700" />

                  <p className="mt-4 text-lg font-semibold">
                    Agendamento confirmado
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    O pagamento do sinal foi confirmado.
                  </p>
                </div>
              ) : isExpired ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                  <p className="font-semibold">
                    Esta reserva expirou
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Volte ao início e escolha outro horário.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border p-6">
                  <div className="flex justify-center gap-5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <QrCode className="size-5" />
                      Pix
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="size-5" />
                      Cartão
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-muted p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Valor do sinal
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {formatCurrency(
                        appointment.deposit_amount_cents,
                      )}
                    </p>
                  </div>

                  <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
                    Você será direcionada para uma página
                    protegida do Asaas para concluir o
                    pagamento.
                  </p>

                  <div className="mt-6">
                    <PaymentButton
                      appointmentId={appointment.id}
                      slug={slug}
                    />
                  </div>

                  {isAsaasSandbox &&
                  appointment.asaas_checkout_id ? (
                    <SandboxPaymentButton
                      appointmentId={appointment.id}
                      slug={slug}
                    />
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}