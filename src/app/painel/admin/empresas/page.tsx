import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { exemptionLabel } from "@/lib/billing/exemptions";
import { ExemptionButton } from "./exemption-button";
import { ReconciliationButton } from "./reconciliation-button";

export default async function AdminCompaniesPage() {
  const admin = createAdminClient();
  const { data: companies, error } = await admin
    .from("companies")
    .select(
      "id, name, slug, email, active, created_at, asaas_account_id, asaas_account_status, company_subscriptions(id, status, billing_exempt, billing_enabled, next_due_date, exemption_reason, exemption_ends_at, exemption_granted_at, billing_plans(code, name, monthly_price_cents))",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Empresas e planos</h1>
          <p className="text-muted-foreground">
            Mensalidades da plataforma são independentes dos sinais das clientes.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ReconciliationButton />
          <Link
            href="/painel/admin/empresas/reconectar"
            className={buttonVariants({ variant: "outline" })}
          >
            Validar reconexão Asaas
          </Link>
        </div>
      </div>
      {error ? (
        <Card>
          <CardContent className="py-8 text-sm text-amber-800">
            A estrutura de billing ainda não está disponível. Revise e aplique a
            migration pendente antes de usar esta tela.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(companies ?? []).map((company) => {
            const subscription = Array.isArray(
              company.company_subscriptions,
            )
              ? company.company_subscriptions[0]
              : company.company_subscriptions;
            const plan = Array.isArray(subscription?.billing_plans)
              ? subscription.billing_plans[0]
              : subscription?.billing_plans;

            return (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-muted-foreground">Slug</p><p>{company.slug}</p></div>
                  <div><p className="text-muted-foreground">Asaas profissional</p><p>{company.asaas_account_status ?? "Não conectado"}</p></div>
                  <div><p className="text-muted-foreground">Plano</p><p>{plan?.name ?? "Não atribuído"}</p></div>
                  <div><p className="text-muted-foreground">Mensalidade</p><p>{exemptionLabel(Boolean(subscription?.billing_exempt), subscription?.exemption_ends_at ?? null) ?? subscription?.status ?? "Pendente"}</p></div>
                  <div><p className="text-muted-foreground">billing_exempt</p><p>{subscription?.billing_exempt ? "true" : "false"}</p></div>
                  <div><p className="text-muted-foreground">billing_enabled</p><p>{subscription?.billing_enabled ? "true" : "false"}</p></div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <ExemptionButton companyId={company.id} exempt={Boolean(subscription?.billing_exempt)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
