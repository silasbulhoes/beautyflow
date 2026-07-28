import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-semibold">
            BeautyFlow
          </Link>

          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Agenda inteligente para profissionais da beleza
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Menos mensagens.
            <br />
            Mais atendimentos.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Automatize seus agendamentos, organize seus horários e receba o
            sinal das clientes em um único lugar.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className={buttonVariants({ size: "lg" })}
            >
              Criar conta
            </Link>

            <Link
              href="#como-funciona"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Conhecer o BeautyFlow
            </Link>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Como funciona
          </p>

          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
            A cliente escolhe, agenda e paga o sinal sem precisar chamar no
            WhatsApp.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-background p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Etapa 1
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Escolha do serviço
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A cliente consulta serviços, preços e duração do atendimento.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Etapa 2
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Horário disponível
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ela visualiza apenas os dias e horários que ainda estão livres.
              </p>
            </div>

            <div className="rounded-xl border bg-background p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Etapa 3
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Sinal e confirmação
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                O pagamento do sinal confirma o agendamento automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}