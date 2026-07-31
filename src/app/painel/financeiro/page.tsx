import {
    CheckCircle2,
    Clock3,
    ShieldCheck,
    WalletCards,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  
  import { FinancialAccountForm } from "./financial-account-form";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@/lib/supabase/server";
  
  type FinancialPageProps = {
    searchParams: Promise<{
      sucesso?: string;
    }>;
  };
  
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
        asaas_account_status,
        asaas_onboarding_completed,
        asaas_connected_at
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
  
          {accountIsConnected ? (
            <div className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletCards className="size-5" />
                    Integração conectada
                  </CardTitle>
  
                  <CardDescription>
                    A empresa já possui uma subconta Asaas.
                  </CardDescription>
                </CardHeader>
  
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <Clock3 className="mt-0.5 size-5 text-amber-700" />
  
                    <div>
                      <p className="font-medium text-amber-800">
                        Cadastro em andamento
                      </p>
  
                      <p className="mt-1 text-sm text-muted-foreground">
                        A próxima etapa será concluir o
                        onboarding e verificar a situação
                        cadastral da conta.
                      </p>
                    </div>
                  </div>
  
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <ShieldCheck className="mt-0.5 size-5 text-green-700" />
  
                    <div>
                      <p className="font-medium">
                        Credencial protegida
                      </p>
  
                      <p className="mt-1 text-sm text-muted-foreground">
                        A chave da subconta foi armazenada
                        criptografada e não é exibida no painel.
                      </p>
                    </div>
                  </div>
  
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Situação
                    </p>
  
                    <p className="font-medium capitalize">
                      {company.asaas_account_status ??
                        "pending"}
                    </p>
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