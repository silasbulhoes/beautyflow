import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-xl font-semibold">BeautyFlow</span>

          <Button variant="outline">Entrar</Button>
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
            <Button size="lg">Criar conta</Button>
            <Button size="lg" variant="outline">
              Conhecer o BeautyFlow
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}