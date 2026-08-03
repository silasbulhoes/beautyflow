import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    KeyRound,
    RadioTower,
    ShieldCheck,
    WalletCards,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  
  import { FinancialAccountForm } from "./financial-account-form";
  import { PixKeyButton } from "./pix-key-button";
  import { WebhookButton } from "./webhook-button";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { getCompanyAsaasCredentials } from "@/lib/asaas/company-client";
  import { asaasRequest } from "@/lib/asaas/request";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type FinancialPageProps = {
    searchParams: Promise<{
      sucesso?: string;
      pix?: string;
    }>;
  };
  
  type AsaasAccountStatus = {
    commercialInfo?: string | null;
    bankAccountInfo?: string | null;
    documentation?: string | null;
    general?: string | null;
  };
  
  type AsaasPixKey = {
    status?: string | null;
  };
  
  type AsaasPixKeyListResponse = {
    data?: AsaasPixKey[];
  };
  
  type AsaasWebhook = {
    id?: string;
    name?: string | null;
    url?: string | null;
    enabled?: boolean;
    interrupted?: boolean;
  };
  
  type AsaasWebhookListResponse = {
    data?: AsaasWebhook[];
  };
  
  type FinancialIntegrationStatus = {
    accountStatus: AsaasAccountStatus | null;
    pixActive: boolean;
    pixPending: boolean;
    webhookActive: boolean;
    hasPartialError: boolean;
  };
  
  const WEBHOOK_NAME = "BeautyFlow Pagamentos";
  
  function getStatusLabel(value: string | null | undefined) {
    switch (value?.toUpperCase()) {
      case "APPROVED":
        return "Aprovado";
  
      case "ACTIVE":
        return "Ativo";
  
      case "PENDING":
        return "Pendente";
  
      case "AWAITING_APPROVAL":
        return "Em análise";
  
      case "AWAITING_ACTIVATION":
        return "Aguardando ativação";
  
      case "REJECTED":
        return "Rejeitado";
  
      case "ERROR":
        return "Erro";
  
      default:
        return "Não consultado";
    }
  }
  
  function getStatusClass(value: string | null | undefined) {
    switch (value?.toUpperCase()) {
      case "APPROVED":
      case "ACTIVE":
        return "bg-green-600/10 text-green-700";
  
      case "REJECTED":
      case "ERROR":
        return "bg-destructive/10 text-destructive";
  
      case "PENDING":
      case "AWAITING_APPROVAL":
      case "AWAITING_ACTIVATION":
        return "bg-amber-500/10 text-amber-800";
  
      default:
        return "bg-muted text-muted-foreground";
    }
  }
  
  async function getFinancialIntegrationStatus(
    companyId: string,
  ): Promise<FinancialIntegrationStatus> {
    const emptyStatus: FinancialIntegrationStatus = {
      accountStatus: null,
      pixActive: false,
      pixPending: false,
      webhookActive: false,
      hasPartialError: false,
    };
  
    try {
      const credentials =
        await getCompanyAsaasCredentials(companyId);
  
      if (!credentials.usingSubaccount) {
        return emptyStatus;
      }
  
      const [
        accountStatusResult,
        pixKeysResult,
        webhooksResult,
      ] = await Promise.allSettled([
        asaasRequest<AsaasAccountStatus>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/myAccount/status/",
          method: "GET",
        }),
  
        asaasRequest<AsaasPixKeyListResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/pix/addressKeys?limit=100&offset=0",
          method: "GET",
        }),
  
        asaasRequest<AsaasWebhookListResponse>({
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          path: "/webhooks?offset=0&limit=100",
          method: "GET",
        }),
      ]);
  
      const accountStatus =
        accountStatusResult.status === "fulfilled"
          ? accountStatusResult.value
          : null;
  
      const pixKeys =
        pixKeysResult.status === "fulfilled" &&
        Array.isArray(pixKeysResult.value.data)
          ? pixKeysResult.value.data
          : [];
  
      const webhooks =
        webhooksResult.status === "fulfilled" &&
        Array.isArray(webhooksResult.value.data)
          ? webhooksResult.value.data
          : [];
  
      const pixActive = pixKeys.some(
        (pixKey) =>
          pixKey.status?.toUpperCase() === "ACTIVE",
      );
  
      const pixPending = pixKeys.some((pixKey) => {
        const status = pixKey.status?.toUpperCase();
  
        return (
          status === "AWAITING_ACTIVATION" ||
          status === "PENDING"
        );
      });
  
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(
          /\/$/,
          "",
        );
  
      const expectedWebhookUrl = appUrl
        ? `${appUrl}/api/webhooks/asaas`
        : null;
  
      const beautyFlowWebhook = webhooks.find(
        (webhook) =>
          webhook.name === WEBHOOK_NAME ||
          Boolean(
            expectedWebhookUrl &&
              webhook.url === expectedWebhookUrl,
          ),
      );
  
      const webhookActive = Boolean(
        beautyFlowWebhook?.enabled &&
          !beautyFlowWebhook.interrupted,
      );
  
      const hasPartialError = [
        accountStatusResult,
        pixKeysResult,
        webhooksResult,
      ].some((result) => result.status === "rejected");
  
      return {
        accountStatus,
        pixActive,
        pixPending,
        webhookActive,
        hasPartialError,
      };
    } catch (error) {
      console.error(
        "Erro ao consultar situação financeira:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
      );
  
      return {
        ...emptyStatus,
        hasPartialError: true,
      };
    }
  }
  
  export default async function FinancialPage({
    searchParams,
  }: FinancialPageProps) {
    const parameters = await searchParams;
  
    const authenticatedSupabase = await createClient();
  
    const {
      data: { user },
    } = await authenticatedSupabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    const { data: profile } = await authenticatedSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
  
    if (!profile?.company_id) {
      redirect("/painel");
    }
  
    const adminSupabase = createAdminClient();
  
    const { data: company } = await adminSupabase
      .from("companies")
      .select(`
        id,
        asaas_account_id,
        asaas_wallet_id,
        asaas_account_status
      `)
      .eq("id", profile.company_id)
      .maybeSingle();
  
    if (!company) {
      redirect("/painel");
    }
  
    const accountIsConnected = Boolean(
      company.asaas_account_id &&
        company.asaas_wallet_id,
    );
  
    const integrationStatus = accountIsConnected
      ? await getFinancialIntegrationStatus(company.id)
      : {
          accountStatus: null,
          pixActive: false,
          pixPending: false,
          webhookActive: false,
          hasPartialError: false,
        };
  
    const generalStatus =
      integrationStatus.accountStatus?.general ??
      company.asaas_account_status ??
      "pending";
  
    const accountApproved =
      generalStatus.toUpperCase() === "APPROVED";
  
    const accountRejected =
      generalStatus.toUpperCase() === "REJECTED";
  
    const defaultName =
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
  
    const defaultEmail = user.email ?? "";
  
    return (
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/painel"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao painel
          </Link>
  
          <div className="mt-5">
            <h1 className="text-3xl font-semibold">
              Conta financeira
            </h1>
  
            <p className="mt-2 text-muted-foreground">
              Configure a conta que receberá os pagamentos dos
              agendamentos.
            </p>
          </div>
  
          {parameters.sucesso === "1" ? (
            <div className="mt-6 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <p className="flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="size-5" />
                Conta financeira criada
              </p>
  
              <p className="mt-1 text-sm text-muted-foreground">
                A subconta foi vinculada ao BeautyFlow com
                segurança.
              </p>
            </div>
          ) : null}
  
          {parameters.sucesso === "1" &&
          parameters.pix === "1" ? (
            <div className="mt-4 rounded-xl border border-green-600/30 bg-green-600/10 p-4">
              <p className="flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="size-5" />
                Chave Pix configurada
              </p>
            </div>
          ) : null}
  
          {accountIsConnected ? (
            <div className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletCards className="size-5" />
                    Integração conectada
                  </CardTitle>
  
                  <CardDescription>
                    A empresa possui uma subconta Asaas
                    vinculada.
                  </CardDescription>
                </CardHeader>
  
                <CardContent className="space-y-5">
                  {integrationStatus.hasPartialError ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                      <AlertTriangle className="mt-0.5 size-5 text-amber-800" />
  
                      <div>
                        <p className="font-medium text-amber-800">
                          Consulta parcialmente indisponível
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          Não foi possível consultar todos os
                          recursos do Asaas. Atualize a página
                          em alguns instantes.
                        </p>
                      </div>
                    </div>
                  ) : null}
  
                  {accountApproved ? (
                    <div className="flex items-start gap-3 rounded-lg border border-green-600/30 bg-green-600/10 p-4">
                      <CheckCircle2 className="mt-0.5 size-5 text-green-700" />
  
                      <div>
                        <p className="font-medium text-green-700">
                          Conta aprovada
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A situação cadastral da subconta está
                          aprovada no Asaas.
                        </p>
                      </div>
                    </div>
                  ) : accountRejected ? (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                      <AlertTriangle className="mt-0.5 size-5 text-destructive" />
  
                      <div>
                        <p className="font-medium text-destructive">
                          Conta rejeitada
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A situação cadastral precisa ser
                          regularizada no Asaas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                      <Clock3 className="mt-0.5 size-5 text-amber-800" />
  
                      <div>
                        <p className="font-medium text-amber-800">
                          Cadastro em análise
                        </p>
  
                        <p className="mt-1 text-sm text-muted-foreground">
                          A subconta ainda possui alguma etapa
                          cadastral pendente.
                        </p>
                      </div>
                    </div>
                  )}
  
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <ShieldCheck className="mt-0.5 size-5 text-green-700" />
  
                    <div>
                      <p className="font-medium">
                        Credencial protegida
                      </p>
  
                      <p className="mt-1 text-sm text-muted-foreground">
                        A chave da subconta está criptografada
                        e não é exibida no painel.
                      </p>
                    </div>
                  </div>
  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Situação geral
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          generalStatus,
                        )}`}
                      >
                        {getStatusLabel(generalStatus)}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Dados comerciais
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.commercialInfo,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.commercialInfo,
                        )}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Documentação
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.documentation,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.documentation,
                        )}
                      </span>
                    </div>
  
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        Conta bancária
                      </p>
  
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          integrationStatus.accountStatus
                            ?.bankAccountInfo,
                        )}`}
                      >
                        {getStatusLabel(
                          integrationStatus.accountStatus
                            ?.bankAccountInfo,
                        )}
                      </span>
                    </div>
                  </div>
  
                  <div className="rounded-lg border p-4">
                    <p className="flex items-center gap-2 font-medium">
                      <KeyRound className="size-4" />
                      Chave Pix da conta
                    </p>
  
                    {integrationStatus.pixActive ? (
                      <div className="mt-4 rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                          <CheckCircle2 className="size-4" />
                          Chave Pix ativa
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {integrationStatus.pixPending
                            ? "A chave Pix ainda está aguardando ativação."
                            : "A subconta ainda não possui uma chave Pix ativa."}
                        </p>
  
                        <div className="mt-4">
                          <PixKeyButton />
                        </div>
                      </>
                    )}
                  </div>
  
                  <div className="rounded-lg border p-4">
                    <p className="flex items-center gap-2 font-medium">
                      <RadioTower className="size-4" />
                      Confirmação automática
                    </p>
  
                    {integrationStatus.webhookActive ? (
                      <div className="mt-4 rounded-lg border border-green-600/30 bg-green-600/10 p-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                          <CheckCircle2 className="size-4" />
                          Webhook ativo
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Configure o webhook para confirmar
                          pagamentos automaticamente.
                        </p>
  
                        <div className="mt-4">
                          <WebhookButton />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>
                  Criar conta de recebimento
                </CardTitle>
  
                <CardDescription>
                  Preencha os dados exatamente como aparecem
                  nos documentos da titular.
                </CardDescription>
              </CardHeader>
  
              <CardContent>
                <FinancialAccountForm
                  defaultName={defaultName}
                  defaultEmail={defaultEmail}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }