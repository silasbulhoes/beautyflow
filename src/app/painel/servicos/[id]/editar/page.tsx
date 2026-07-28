import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditServiceForm } from "./edit-service-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type EditarServicoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarServicoPage({
  params,
}: EditarServicoPageProps) {
  const { id } = await params;

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

  const { data: service } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_percentage",
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/painel/servicos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar aos serviços
        </Link>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Editar serviço</CardTitle>

            <CardDescription>
              Altere preço, duração, descrição ou sinal.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <EditServiceForm service={service} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}