import Link from "next/link";
import { redirect } from "next/navigation";

import {
  alternarStatusHorario,
  excluirHorario,
} from "./actions";
import { AvailabilityForm } from "./availability-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const weekdayNames: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function formatTime(value: string) {
  return value.slice(0, 5);
}

export default async function DisponibilidadePage() {
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

  const { data: schedules, error } = await supabase
    .from("business_hours")
    .select(
      "id, weekday, start_time, end_time, active",
    )
    .eq("company_id", profile.company_id)
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
  );

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
            Disponibilidade
          </h1>

          <p className="mt-2 text-muted-foreground">
            Configure os dias e horários em que suas clientes poderão agendar.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.35fr]">
          <AvailabilityForm />

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Horários cadastrados
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Horários inativos não serão exibidos para as clientes.
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Não foi possível carregar os horários.
              </p>
            ) : null}

            <div className="space-y-5">
              {schedulesByWeekday.map(
                ({ weekday, schedules: daySchedules }) => (
                  <Card key={weekday}>
                    <CardHeader>
                      <CardTitle>
                        {weekdayNames[weekday]}
                      </CardTitle>

                      <CardDescription>
                        {daySchedules.length > 0
                          ? `${daySchedules.length} período(s) cadastrado(s).`
                          : "Nenhum horário cadastrado."}
                      </CardDescription>
                    </CardHeader>

                    {daySchedules.length > 0 ? (
                      <CardContent className="space-y-3">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="rounded-lg border bg-background p-4"
                          >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                              <div>
                                <p className="font-medium">
                                  {formatTime(schedule.start_time)}
                                  {" às "}
                                  {formatTime(schedule.end_time)}
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                  {schedule.active
                                    ? "Disponível para agendamento"
                                    : "Horário desativado"}
                                </p>
                              </div>

                              <span
                                className={
                                  schedule.active
                                    ? "w-fit rounded-full bg-green-600/10 px-3 py-1 text-xs font-medium text-green-700"
                                    : "w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                                }
                              >
                                {schedule.active
                                  ? "Ativo"
                                  : "Inativo"}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <form action={alternarStatusHorario}>
                                <input
                                  type="hidden"
                                  name="scheduleId"
                                  value={schedule.id}
                                />

                                <input
                                  type="hidden"
                                  name="active"
                                  value={String(schedule.active)}
                                />

                                <Button
                                  type="submit"
                                  variant="outline"
                                  className="w-full"
                                >
                                  {schedule.active
                                    ? "Desativar"
                                    : "Ativar"}
                                </Button>
                              </form>

                              <form action={excluirHorario}>
                                <input
                                  type="hidden"
                                  name="scheduleId"
                                  value={schedule.id}
                                />

                                <Button
                                  type="submit"
                                  variant="outline"
                                  className="w-full"
                                >
                                  Excluir
                                </Button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    ) : null}
                  </Card>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}