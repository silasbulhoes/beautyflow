import Link from "next/link";
import { redirect } from "next/navigation";

import { sair } from "./actions";

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

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "Profissional";

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/painel"
            className="text-xl font-semibold"
          >
            BeautyFlow
          </Link>

          <form action={sair}>
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <h1 className="text-3xl font-semibold">
            Olá, {name}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Gerencie sua agenda, serviços, horários e
            clientes.
          </p>
        </div>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Agenda</CardTitle>

              <CardDescription>
                Veja o calendário, clientes e horários
                marcados.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link
                href="/painel/agenda"
                className={buttonVariants({
                  className: "w-full",
                })}
              >
                Abrir agenda
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>

              <CardDescription>
                Consulte contatos e histórico de
                atendimentos.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link
                href="/painel/clientes"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                Ver clientes
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços</CardTitle>

              <CardDescription>
                Cadastre preços, duração e valor do sinal.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link
                href="/painel/servicos"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                Gerenciar serviços
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade</CardTitle>

              <CardDescription>
                Configure seus dias e horários de
                atendimento.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link
                href="/painel/disponibilidade"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                Gerenciar horários
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}