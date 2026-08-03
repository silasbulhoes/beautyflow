import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    DatabaseZap,
    History,
    ShieldCheck,
    UserRoundX,
  } from "lucide-react";
  import Link from "next/link";
  import {
    notFound,
    redirect,
  } from "next/navigation";
  
  import { runPrivacyRetention } from "./actions";
  
  import { Button } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { isAdminEmail } from "@/lib/admin-access";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type RetentionPageProps = {
    searchParams: Promise<{
      executado?: string;
      quantidade?: string;
      erro?: string;
    }>;
  };
  
  type RetentionPreview = {
    candidate_clients: number;
    candidate_appointments: number;
    cutoff_date: string;
  };
  
  type RetentionRun = {
    id: string;
    retention_days: number;
    cutoff_date: string;
    candidate_clients: number;
    anonymized_clients: number;
    handled_by_email: string;
    created_at: string;
  };
  
  const BRAZIL_TIME_ZONE =
    "America/Sao_Paulo";
  
  function formatDate(
    value: string | null | undefined,
  ) {
    if (!value) {
      return "Não informada";
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return value;
    }
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: BRAZIL_TIME_ZONE,
    }).format(date);
  }
  
  function formatDateTime(value: string) {
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "Não informada";
    }
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BRAZIL_TIME_ZONE,
    }).format(date);
  }
  
  function getErrorMessage(
    error: string | undefined,
  ) {
    switch (error) {
      case "confirmacao":
        return 'Digite exatamente "ANONIMIZAR" para confirmar.';
  
      case "execucao":
        return "Não foi possível executar a anonimização.";
  
      default:
        return null;
    }
  }
  
  export default async function RetentionPage({
    searchParams,
  }: RetentionPageProps) {
    const parameters = await searchParams;
  
    const authenticatedSupabase =
      await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    if (!isAdminEmail(user.email)) {
      notFound();
    }
  
    const adminSupabase = createAdminClient();
  
    const [previewResult, historyResult] =
      await Promise.all([
        adminSupabase.rpc(
          "preview_privacy_retention",
          {
            p_days: 90,
          },
        ),
  
        adminSupabase
          .from("privacy_retention_runs")
          .select(`
            id,
            retention_days,
            cutoff_date,
            candidate_clients,
            anonymized_clients,
            handled_by_email,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);
  
    const previewData = (
      Array.isArray(previewResult.data)
        ? previewResult.data[0]
        : previewResult.data
    ) as RetentionPreview | null;
  
    const history =
      (historyResult.data as
        | RetentionRun[]
        | null) ?? [];
  
    const candidateClients = Number(
      previewData?.candidate_clients ?? 0,
    );
  
    const candidateAppointments = Number(
      previewData?.candidate_appointments ??
        0,
    );
  
    const errorMessage = getErrorMessage(
      parameters.erro,
    );
  
    const executedQuantity = Math.max(
      0,
      Number(parameters.quantidade ?? 0),
    );
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/painel/admin/privacidade"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar às solicitações LGPD
          </Link>
  
          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <DatabaseZap className="size-6 text-primary" />
            </div>
  
            <div>
              <h1 className="text-3xl font-semibold">
                Retenção e anonimização
              </h1>
  
              <p className="mt-2 text-muted-foreground">
                Remova dados pessoais de reservas
                expiradas ou canceladas que já não
                precisam permanecer identificadas.
              </p>
            </div>
          </div>
  
          {parameters.executado === "1" ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-green-700" />
  
              <div>
                <p className="font-medium text-green-700">
                  Anonimização concluída
                </p>
  
                <p className="mt-1 text-sm text-muted-foreground">
                  {executedQuantity} cliente(s)
                  foram anonimizados.
                </p>
              </div>
            </div>
          ) : null}
  
          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
  
          {previewResult.error ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível consultar os registros
              candidatos.
            </div>
          ) : null}
  
          <section className="mt-8 grid gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes candidatos
                </CardTitle>
  
                <UserRoundX className="size-5 text-amber-700" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-amber-700">
                  {candidateClients}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Agendamentos antigos
                </CardTitle>
  
                <Clock3 className="size-5 text-muted-foreground" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold">
                  {candidateAppointments}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Data de corte
                </CardTitle>
  
                <ShieldCheck className="size-5 text-muted-foreground" />
              </CardHeader>
  
              <CardContent>
                <p className="text-lg font-semibold capitalize">
                  {formatDate(
                    previewData?.cutoff_date,
                  )}
                </p>
  
                <p className="mt-1 text-xs text-muted-foreground">
                  Regra atual: 90 dias
                </p>
              </CardContent>
            </Card>
          </section>
  
          <Card className="mt-6 border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-700" />
                Executar anonimização
              </CardTitle>
  
              <CardDescription>
                Esta operação não poderá recuperar nome,
                CPF, telefone ou e-mail removidos.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                <p className="font-medium text-foreground">
                  O sistema não anonimizará:
                </p>
  
                <p className="mt-2">
                  pagamentos recebidos ou confirmados;
                  agendamentos confirmados; pagamentos
                  pendentes ativos; clientes com
                  movimentações nos últimos 90 dias.
                </p>
              </div>
  
              <form
                action={runPrivacyRetention}
                className="mt-5 space-y-4"
              >
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Digite ANONIMIZAR para confirmar
                  </span>
  
                  <input
                    type="text"
                    name="confirmation"
                    autoComplete="off"
                    placeholder="ANONIMIZAR"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </label>
  
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={candidateClients === 0}
                >
                  Anonimizar {candidateClients} cliente(s)
                </Button>
              </form>
            </CardContent>
          </Card>
  
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                Histórico de execuções
              </CardTitle>
  
              <CardDescription>
                Últimas operações realizadas por
                administradores.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              {historyResult.error ? (
                <p className="text-sm text-destructive">
                  Não foi possível carregar o histórico.
                </p>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-dashed py-12 text-center">
                  <History className="mx-auto size-9 text-muted-foreground" />
  
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma execução registrada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium">
                            {run.anonymized_clients}{" "}
                            cliente(s) anonimizado(s)
                          </p>
  
                          <p className="mt-1 text-sm text-muted-foreground">
                            {run.candidate_clients}{" "}
                            candidato(s) encontrado(s)
                          </p>
                        </div>
  
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(
                            run.created_at,
                          )}
                        </p>
                      </div>
  
                      <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Prazo
                          </p>
  
                          <p className="mt-1 font-medium">
                            {run.retention_days} dias
                          </p>
                        </div>
  
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Data de corte
                          </p>
  
                          <p className="mt-1 font-medium">
                            {formatDate(
                              run.cutoff_date,
                            )}
                          </p>
                        </div>
  
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Responsável
                          </p>
  
                          <p className="mt-1 break-all font-medium">
                            {run.handled_by_email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }