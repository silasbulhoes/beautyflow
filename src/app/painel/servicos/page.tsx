import Link from "next/link";
import { redirect } from "next/navigation";

import { alternarStatusServico } from "./actions";
import { ServiceForm } from "./service-form";

import {
  Button,
  buttonVariants,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export default async function ServicosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    redirect("/painel");
  }

  const { data: services, error } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_percentage, active",
    )
    .eq("company_id", profile.company_id)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">
            Serviços
          </h1>

          <p className="mt-2 text-muted-foreground">
            Cadastre e gerencie os serviços disponíveis para agendamento.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <ServiceForm />

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Serviços cadastrados
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Serviços desativados não serão exibidos para as clientes.
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Não foi possível carregar os serviços.
              </p>
            ) : null}

            {!error && services?.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum serviço cadastrado ainda.
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-4">
              {services?.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{service.name}</CardTitle>

                        <CardDescription className="mt-1">
                          {service.description || "Sem descrição."}
                        </CardDescription>
                      </div>

                      <span
                        className={
                          service.active
                            ? "rounded-full bg-green-600/10 px-3 py-1 text-xs font-medium text-green-700"
                            : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {service.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
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
                          {service.duration_minutes} minutos
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Sinal
                        </p>

                        <p className="font-medium">
                          {service.deposit_percentage}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/painel/servicos/${service.id}/editar`}
                        className={buttonVariants({
                          variant: "outline",
                          className: "w-full",
                        })}
                      >
                        Editar
                      </Link>

                      <form action={alternarStatusServico}>
                        <input
                          type="hidden"
                          name="serviceId"
                          value={service.id}
                        />

                        <input
                          type="hidden"
                          name="active"
                          value={String(service.active)}
                        />

                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full"
                        >
                          {service.active
                            ? "Desativar serviço"
                            : "Ativar serviço"}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}