"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import type { PlanCode } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

export type CadastroState = {
  error?: string;
};

export async function cadastrar(
  _previousState: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );
  const acceptedTerms = formData.get("acceptedTerms") === "on";
  const acceptedPrivacy = formData.get("acceptedPrivacy") === "on";
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  const requestedPlan = referer
    ? new URL(referer).searchParams.get("plano")
    : null;
  const validPlans: PlanCode[] = ["free", "intermediate", "advanced"];
  const selectedPlan = validPlans.includes(requestedPlan as PlanCode)
    ? requestedPlan
    : "free";

  if (!name || !businessName || !email || !password) {
    return {
      error: "Preencha todos os campos.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (password !== passwordConfirmation) {
    return { error: "As senhas não coincidem." };
  }

  if (!acceptedTerms || !acceptedPrivacy) {
    return { error: "Aceite os Termos de Uso e o Aviso de Privacidade." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        business_name: businessName,
        selected_plan: selectedPlan,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
      },
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  redirect("/cadastro/sucesso");
}
