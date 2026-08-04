import {
    LockKeyhole,
    ShieldCheck,
  } from "lucide-react";
  import type { Metadata } from "next";
  import { redirect } from "next/navigation";
  
  import { AdminMfaForm } from "./admin-mfa-form";
  
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { isAdminEmail } from "@/lib/admin-access";
  import { createClient } from "@/lib/supabase/server";
  
  export const metadata: Metadata = {
    title:
      "Verificação de segurança | BeautyFlow",
    description:
      "Autenticação em dois fatores da área administrativa.",
  };
  
  export default async function MfaPage() {
    const supabase = await createClient();
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    if (!isAdminEmail(user.email)) {
      redirect("/painel");
    }
  
    const assuranceResult =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();
  
    if (
      !assuranceResult.error &&
      assuranceResult.data.currentLevel ===
        "aal2"
    ) {
      redirect("/painel/admin/subcontas");
    }
  
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="size-7 text-primary" />
            </div>
  
            <h1 className="mt-5 text-3xl font-semibold">
              Proteção administrativa
            </h1>
  
            <p className="mt-2 text-muted-foreground">
              A área administrativa exige uma
              verificação adicional de segurança.
            </p>
          </div>
  
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-5" />
                Autenticação em dois fatores
              </CardTitle>
  
              <CardDescription>
                O código muda periodicamente e deve ser
                consultado no seu aplicativo
                autenticador.
              </CardDescription>
            </CardHeader>
  
            <CardContent>
              <AdminMfaForm />
            </CardContent>
          </Card>
  
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            Esta verificação protege subcontas,
            solicitações LGPD, retenção de dados e
            demais funções administrativas.
          </p>
        </div>
      </main>
    );
  }