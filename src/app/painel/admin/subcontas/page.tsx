import {
    Building2,
    CircleDollarSign,
    Link2,
    Search,
    ShieldCheck,
    Unlink,
    UsersRound,
  } from "lucide-react";
  import Link from "next/link";
  import { notFound, redirect } from "next/navigation";
  
  import { asaasRequest } from "@/lib/asaas/request";
  import { getProfessionalAsaasRuntime } from "@/lib/asaas/environment";
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
  import { Input } from "@/components/ui/input";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type AdminSubaccountsPageProps = {
    searchParams: Promise<{
      busca?: string;
      filtro?: string;
    }>;
  };
  
  type AsaasSubaccount = {
    id?: string;
    name?: string;
    email?: string;
    cpfCnpj?: string;
    walletId?: string;
    status?: string;
    createdAt?: string;
  };
  
  type AsaasSubaccountListResponse = {
    object?: string;
    hasMore?: boolean;
    totalCount?: number;
    limit?: number;
    offset?: number;
    data?: AsaasSubaccount[];
  };
  
  type CompanyRecord = {
    id: string;
    name: string;
    slug: string;
    asaas_account_id: string | null;
    asaas_wallet_id: string | null;
    asaas_account_status: string | null;
  };
  
  type DisplaySubaccount = AsaasSubaccount & {
    linkedCompany: CompanyRecord | null;
    linked: boolean;
  };
  
  function getAdminEmails() {
    return String(
      process.env.BEAUTYFLOW_ADMIN_EMAILS ?? "",
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
  
  function normalizeSearchValue(
    value: string | null | undefined,
  ) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
  
  function formatDocument(
    value: string | null | undefined,
  ) {
    const digits = String(value ?? "").replace(
      /\D/g,
      "",
    );
  
    if (!digits) {
      return "Não informado";
    }
  
    const visibleEnding = digits.slice(-4);
  
    return `••••••${visibleEnding}`;
  }
  
  function formatDate(
    value: string | null | undefined,
  ) {
    if (!value) {
      return "Não informada";
    }
  
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
    }).format(date);
  }
  
  function getAccountStatusLabel(
    value: string | null | undefined,
  ) {
    switch (value?.toUpperCase()) {
      case "ACTIVE":
        return "Ativa";
  
      case "APPROVED":
        return "Aprovada";
  
      case "PENDING":
        return "Pendente";
  
      case "AWAITING_APPROVAL":
        return "Em análise";
  
      case "REJECTED":
        return "Rejeitada";
  
      case "DISABLED":
        return "Desativada";
  
      default:
        return value || "Não informado";
    }
  }
  
  function getAccountStatusClass(
    value: string | null | undefined,
  ) {
    switch (value?.toUpperCase()) {
      case "ACTIVE":
      case "APPROVED":
        return "bg-green-600/10 text-green-700";
  
      case "REJECTED":
      case "DISABLED":
        return "bg-destructive/10 text-destructive";
  
      case "PENDING":
      case "AWAITING_APPROVAL":
        return "bg-amber-500/10 text-amber-800";
  
      default:
        return "bg-muted text-muted-foreground";
    }
  }
  
  export default async function AdminSubaccountsPage({
    searchParams,
  }: AdminSubaccountsPageProps) {
    const parameters = await searchParams;
  
    const searchTerm = String(
      parameters.busca ?? "",
    ).trim();
  
    const selectedFilter = [
      "todas",
      "vinculadas",
      "orfas",
    ].includes(parameters.filtro ?? "")
      ? parameters.filtro
      : "todas";
  
    const authenticatedSupabase =
      await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    const userEmail = user.email?.toLowerCase();
  
    const adminEmails = getAdminEmails();
  
    if (
      !userEmail ||
      !adminEmails.includes(userEmail)
    ) {
      notFound();
    }
  
    const asaasApiUrl = getProfessionalAsaasRuntime().apiUrl;
  
    const parentApiKey =
      process.env.ASAAS_API_KEY;
  
    if (!asaasApiUrl || !parentApiKey) {
      return (
        <main className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/painel"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar ao painel
            </Link>
  
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
              A integração principal do Asaas não está
              configurada.
            </div>
          </div>
        </main>
      );
    }
  
    const adminSupabase = createAdminClient();
  
    const { data: companiesData, error: companiesError } =
      await adminSupabase
        .from("companies")
        .select(`
          id,
          name,
          slug,
          asaas_account_id,
          asaas_wallet_id,
          asaas_account_status
        `)
        .order("name");
  
    const companies =
      (companiesData as CompanyRecord[] | null) ?? [];
  
    const companyByAccountId = new Map<
      string,
      CompanyRecord
    >();
  
    const companyByWalletId = new Map<
      string,
      CompanyRecord
    >();
  
    for (const company of companies) {
      if (company.asaas_account_id) {
        companyByAccountId.set(
          company.asaas_account_id,
          company,
        );
      }
  
      if (company.asaas_wallet_id) {
        companyByWalletId.set(
          company.asaas_wallet_id,
          company,
        );
      }
    }
  
    let asaasSubaccounts: AsaasSubaccount[] = [];
    let asaasTotalCount = 0;
    let asaasHasMore = false;
    let asaasError: string | null = null;
  
    try {
      const result =
        await asaasRequest<AsaasSubaccountListResponse>({
          apiUrl: asaasApiUrl,
          apiKey: parentApiKey,
          path: "/accounts?offset=0&limit=100",
          method: "GET",
        });
  
      asaasSubaccounts = Array.isArray(result.data)
        ? result.data
        : [];
  
      asaasTotalCount =
        result.totalCount ?? asaasSubaccounts.length;
  
      asaasHasMore = Boolean(result.hasMore);
    } catch (error) {
      console.error(
        "Erro ao listar subcontas do Asaas:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );
  
      asaasError =
        error instanceof Error
          ? error.message
          : "Não foi possível consultar as subcontas.";
    }
  
    const displaySubaccounts: DisplaySubaccount[] =
      asaasSubaccounts.map((account) => {
        const linkedByAccountId = account.id
          ? companyByAccountId.get(account.id)
          : undefined;
  
        const linkedByWalletId = account.walletId
          ? companyByWalletId.get(account.walletId)
          : undefined;
  
        const linkedCompany =
          linkedByAccountId ??
          linkedByWalletId ??
          null;
  
        return {
          ...account,
          linkedCompany,
          linked: Boolean(linkedCompany),
        };
      });
  
    const linkedCount = displaySubaccounts.filter(
      (account) => account.linked,
    ).length;
  
    const orphanCount =
      displaySubaccounts.length - linkedCount;
  
    const normalizedSearch =
      normalizeSearchValue(searchTerm);
  
    const filteredSubaccounts =
      displaySubaccounts.filter((account) => {
        if (
          selectedFilter === "vinculadas" &&
          !account.linked
        ) {
          return false;
        }
  
        if (
          selectedFilter === "orfas" &&
          account.linked
        ) {
          return false;
        }
  
        if (!normalizedSearch) {
          return true;
        }
  
        const searchableText = [
          account.id,
          account.name,
          account.email,
          account.cpfCnpj,
          account.walletId,
          account.status,
          account.linkedCompany?.name,
          account.linkedCompany?.slug,
        ]
          .map(normalizeSearchValue)
          .join(" ");
  
        return searchableText.includes(
          normalizedSearch,
        );
      });
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>
  
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="size-6 text-primary" />
                </div>
  
                <div>
                  <h1 className="text-3xl font-semibold">
                    Administração financeira
                  </h1>
  
                  <p className="mt-1 text-muted-foreground">
                    Subcontas existentes na conta-pai do
                    BeautyFlow.
                  </p>
                </div>
              </div>
            </div>
  
            <Link
              href="/painel/financeiro"
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Conta financeira do estúdio
            </Link>
          </div>
  
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Subcontas no Asaas
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold">
                  {asaasTotalCount}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Exibidas nesta consulta
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold">
                  {displaySubaccounts.length}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Vinculadas ao BeautyFlow
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-green-700">
                  {linkedCount}
                </p>
              </CardContent>
            </Card>
  
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>
                  Sem vínculo no Supabase
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <p className="text-3xl font-semibold text-amber-700">
                  {orphanCount}
                </p>
              </CardContent>
            </Card>
          </section>
  
          {asaasError ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {asaasError}
            </div>
          ) : null}
  
          {companiesError ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Não foi possível consultar as empresas do
              BeautyFlow.
            </div>
          ) : null}
  
          {asaasHasMore ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              Existem mais de 100 subcontas. Esta primeira
              versão do painel mostra somente as 100 primeiras.
            </div>
          ) : null}
  
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Buscar subcontas</CardTitle>
  
              <CardDescription>
                Pesquise por nome, e-mail, documento,
                accountId, walletId ou empresa vinculada.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  
                  <Input
                    name="busca"
                    defaultValue={searchTerm}
                    placeholder="Nome, e-mail, documento..."
                    className="pl-9"
                  />
                </div>
  
                <select
                  name="filtro"
                  defaultValue={selectedFilter}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="todas">
                    Todas
                  </option>
  
                  <option value="vinculadas">
                    Somente vinculadas
                  </option>
  
                  <option value="orfas">
                    Somente sem vínculo
                  </option>
                </select>
  
                <Button type="submit">
                  Buscar
                </Button>
              </form>
            </CardContent>
          </Card>
  
          <section className="mt-6 space-y-4">
            {filteredSubaccounts.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <UsersRound className="mx-auto size-10 text-muted-foreground" />
  
                  <p className="mt-4 font-medium">
                    Nenhuma subconta encontrada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSubaccounts.map((account, index) => (
                <Card
                  key={
                    account.id ??
                    account.walletId ??
                    `${account.email}-${index}`
                  }
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                            account.linked
                              ? "bg-green-600/10"
                              : "bg-amber-500/10"
                          }`}
                        >
                          {account.linked ? (
                            <Link2 className="size-5 text-green-700" />
                          ) : (
                            <Unlink className="size-5 text-amber-700" />
                          )}
                        </div>
  
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">
                            {account.name ??
                              "Subconta sem nome"}
                          </h2>
  
                          <p className="mt-1 break-all text-sm text-muted-foreground">
                            {account.email ??
                              "E-mail não informado"}
                          </p>
  
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getAccountStatusClass(
                                account.status,
                              )}`}
                            >
                              {getAccountStatusLabel(
                                account.status,
                              )}
                            </span>
  
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                account.linked
                                  ? "bg-green-600/10 text-green-700"
                                  : "bg-amber-500/10 text-amber-800"
                              }`}
                            >
                              {account.linked
                                ? "Vinculada"
                                : "Sem vínculo"}
                            </span>
                          </div>
                        </div>
                      </div>
  
                      {account.linkedCompany ? (
                        <Link
                          href="/painel/financeiro"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Abrir empresa vinculada
                        </Link>
                      ) : null}
                    </div>
  
                    <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Documento
                        </p>
  
                        <p className="mt-1 font-medium">
                          {formatDocument(
                            account.cpfCnpj,
                          )}
                        </p>
                      </div>
  
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Empresa BeautyFlow
                        </p>
  
                        <p className="mt-1 font-medium">
                          {account.linkedCompany?.name ??
                            "Nenhuma"}
                        </p>
  
                        {account.linkedCompany ? (
                          <p className="text-xs text-muted-foreground">
                            /{account.linkedCompany.slug}
                          </p>
                        ) : null}
                      </div>
  
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Criada em
                        </p>
  
                        <p className="mt-1 font-medium">
                          {formatDate(
                            account.createdAt,
                          )}
                        </p>
                      </div>
  
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ambiente
                        </p>
  
                        <p className="mt-1 font-medium">
                          {asaasApiUrl.includes(
                            "api-sandbox",
                          )
                            ? "Sandbox"
                            : "Produção"}
                        </p>
                      </div>
                    </div>
  
                    <div className="mt-5 grid gap-3 rounded-xl bg-muted/50 p-4 lg:grid-cols-2">
                      <div>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="size-3.5" />
                          Account ID
                        </p>
  
                        <p className="mt-1 break-all font-mono text-xs">
                          {account.id ??
                            "Não informado"}
                        </p>
                      </div>
  
                      <div>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CircleDollarSign className="size-3.5" />
                          Wallet ID
                        </p>
  
                        <p className="mt-1 break-all font-mono text-xs">
                          {account.walletId ??
                            "Não informado"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        </div>
      </main>
    );
  }
