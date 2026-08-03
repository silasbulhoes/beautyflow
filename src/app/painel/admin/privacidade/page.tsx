import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileLock2,
    Search,
    ShieldAlert,
    UserCheck,
  } from "lucide-react";
  import Link from "next/link";
  import {
    notFound,
    redirect,
  } from "next/navigation";
  
  import { buttonVariants } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { isAdminEmail } from "@/lib/admin-access";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type PrivacyRequestsPageProps = {
    searchParams: Promise<{
      busca?: string;
      status?: string;
      erro?: string;
    }>;
  };
  
  type PrivacyRequestRecord = {
    id: string;
    protocol: string;
    requester_name: string;
    requester_email: string;
    requester_role: string;
    request_type: string;
    company_reference: string | null;
    status: string;
    identity_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  
  const allowedStatusFilters = [
    "all",
    "received",
    "verifying_identity",
    "in_review",
    "awaiting_information",
    "completed",
    "denied",
  ];
  
  const brazilTimeZone = "America/Sao_Paulo";
  
  function normalizeSearchValue(
    value: string | null | undefined,
  ) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }
  
  function formatDate(value: string) {
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "Data não informada";
    }
  
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: brazilTimeZone,
    }).format(date);
  }
  
  function getOpenDays(value: string) {
    const createdAt = new Date(value);
  
    if (Number.isNaN(createdAt.getTime())) {
      return 0;
    }
  
    return Math.max(
      0,
      Math.floor(
        (Date.now() - createdAt.getTime()) /
          86_400_000,
      ),
    );
  }
  
  function getStatusLabel(status: string) {
    switch (status) {
      case "received":
        return "Recebida";
  
      case "verifying_identity":
        return "Verificando identidade";
  
      case "in_review":
        return "Em análise";
  
      case "awaiting_information":
        return "Aguardando informações";
  
      case "completed":
        return "Concluída";
  
      case "denied":
        return "Negada";
  
      default:
        return "Não identificada";
    }
  }
  
  function getStatusClass(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-600/10 text-green-700";
  
      case "denied":
        return "bg-red-600/10 text-red-700";
  
      case "received":
        return "bg-blue-600/10 text-blue-700";
  
      case "verifying_identity":
      case "in_review":
      case "awaiting_information":
        return "bg-amber-500/10 text-amber-800";
  
      default:
        return "bg-muted text-muted-foreground";
    }
  }
  
  function getRequestTypeLabel(
    requestType: string,
  ) {
    switch (requestType) {
      case "confirmation":
        return "Confirmação de tratamento";
  
      case "access":
        return "Acesso aos dados";
  
      case "correction":
        return "Correção";
  
      case "deletion":
        return "Exclusão";
  
      case "anonymization":
        return "Anonimização ou bloqueio";
  
      case "sharing_information":
        return "Informações sobre compartilhamento";
  
      case "consent_revocation":
        return "Revogação de consentimento";
  
      default:
        return "Outra solicitação";
    }
  }
  
  function getRequesterRoleLabel(
    role: string,
  ) {
    switch (role) {
      case "client":
        return "Cliente";
  
      case "professional":
        return "Profissional ou estúdio";
  
      default:
        return "Outra pessoa";
    }
  }
  
  export default async function PrivacyRequestsPage({
    searchParams,
  }: PrivacyRequestsPageProps) {
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
  
    const searchTerm = String(
      parameters.busca ?? "",
    ).trim();
  
    const selectedStatus =
      allowedStatusFilters.includes(
        parameters.status ?? "",
      )
        ? parameters.status!
        : "all";
  
    const adminSupabase = createAdminClient();
  
    const { data, error } = await adminSupabase
      .from("privacy_requests")
      .select(`
        id,
        protocol,
        requester_name,
        requester_email,
        requester_role,
        request_type,
        company_reference,
        status,
        identity_verified,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      });
  
    const requests =
      (data as PrivacyRequestRecord[] | null) ??
      [];
  
    const normalizedSearch =
      normalizeSearchValue(searchTerm);
  
    const filteredRequests = requests.filter(
      (request) => {
        if (
          selectedStatus !== "all" &&
          request.status !== selectedStatus
        ) {
          return false;
        }
  
        if (!normalizedSearch) {
          return true;
        }
  
        const searchableText = [
          request.protocol,
          request.requester_name,
          request.requester_email,
          request.company_reference,
          request.request_type,
          request.status,
        ]
          .map(normalizeSearchValue)
          .join(" ");
  
        return searchableText.includes(
          normalizedSearch,
        );
      },
    );
  
    const receivedCount = requests.filter(
      (request) =>
        request.status === "received",
    ).length;
  
    const inProgressCount = requests.filter(
      (request) =>
        [
          "verifying_identity",
          "in_review",
          "awaiting_information",
        ].includes(request.status),
    ).length;
  
    const completedCount = requests.filter(
      (request) =>
        request.status === "completed",
    ).length;
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>
  
          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileLock2 className="size-6 text-primary" />
            </div>
  
            <div>
              <h1 className="text-3xl font-semibold">
                Solicitações LGPD
              </h1>
  
              <p className="mt-2 text-muted-foreground">
                Acompanhe solicitações relacionadas aos
                dados pessoais tratados pelo BeautyFlow.
              </p>
            </div>
          </div>
  
          {parameters.erro ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível localizar a solicitação.
            </div>
          ) : null}
  
          {error ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível carregar as solicitações.
            </div>
          ) : null}
  
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total
                </CardTitle>
  
                <FileLock2 className="size-5 text-muted-foreground" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold">
                  {requests.length}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Novas
                </CardTitle>
  
                <ShieldAlert className="size-5 text-blue-700" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-blue-700">
                  {receivedCount}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Em andamento
                </CardTitle>
  
                <Clock3 className="size-5 text-amber-700" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-amber-700">
                  {inProgressCount}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  Concluídas
                </CardTitle>
  
                <CheckCircle2 className="size-5 text-green-700" />
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-green-700">
                  {completedCount}
                </p>
              </CardContent>
            </Card>
          </section>
  
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Buscar solicitações
              </CardTitle>
  
              <CardDescription>
                Pesquise por protocolo, nome, e-mail ou
                estabelecimento.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  
                  <Input
                    name="busca"
                    defaultValue={searchTerm}
                    placeholder="Protocolo, nome ou e-mail..."
                    className="pl-9"
                  />
                </div>
  
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all">
                    Todas as situações
                  </option>
  
                  <option value="received">
                    Recebidas
                  </option>
  
                  <option value="verifying_identity">
                    Verificando identidade
                  </option>
  
                  <option value="in_review">
                    Em análise
                  </option>
  
                  <option value="awaiting_information">
                    Aguardando informações
                  </option>
  
                  <option value="completed">
                    Concluídas
                  </option>
  
                  <option value="denied">
                    Negadas
                  </option>
                </select>
  
                <button
                  type="submit"
                  className={buttonVariants()}
                >
                  Buscar
                </button>
              </form>
            </CardContent>
          </Card>
  
          <section className="mt-6 space-y-4">
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <FileLock2 className="mx-auto size-10 text-muted-foreground" />
  
                  <p className="mt-4 font-medium">
                    Nenhuma solicitação encontrada
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => {
                const daysOpen = getOpenDays(
                  request.created_at,
                );
  
                return (
                  <Link
                    key={request.id}
                    href={`/painel/admin/privacidade/${request.id}`}
                    className="group block"
                  >
                    <Card className="transition-colors group-hover:bg-muted/40">
                      <CardContent className="p-5">
                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              {request.identity_verified ? (
                                <UserCheck className="size-5 text-green-700" />
                              ) : (
                                <FileLock2 className="size-5 text-primary" />
                              )}
                            </div>
  
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-semibold">
                                  {request.requester_name}
                                </h2>
  
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                                    request.status,
                                  )}`}
                                >
                                  {getStatusLabel(
                                    request.status,
                                  )}
                                </span>
  
                                {request.identity_verified ? (
                                  <span className="rounded-full bg-green-600/10 px-3 py-1 text-xs font-medium text-green-700">
                                    Identidade verificada
                                  </span>
                                ) : null}
                              </div>
  
                              <p className="mt-1 break-all text-sm text-muted-foreground">
                                {request.requester_email}
                              </p>
  
                              <p className="mt-3 text-sm font-medium">
                                {getRequestTypeLabel(
                                  request.request_type,
                                )}
                              </p>
  
                              <p className="mt-1 text-sm text-muted-foreground">
                                {getRequesterRoleLabel(
                                  request.requester_role,
                                )}
  
                                {request.company_reference
                                  ? ` · ${request.company_reference}`
                                  : ""}
                              </p>
                            </div>
                          </div>
  
                          <div className="flex shrink-0 items-center justify-between gap-5 lg:justify-end">
                            <div className="text-right">
                              <p className="font-mono text-sm font-medium">
                                {request.protocol}
                              </p>
  
                              <p className="mt-1 text-xs text-muted-foreground">
                                Recebida em{" "}
                                {formatDate(
                                  request.created_at,
                                )}
                              </p>
  
                              {![
                                "completed",
                                "denied",
                              ].includes(
                                request.status,
                              ) ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Aberta há {daysOpen} dia(s)
                                </p>
                              ) : null}
                            </div>
  
                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </section>
        </div>
      </main>
    );
  }