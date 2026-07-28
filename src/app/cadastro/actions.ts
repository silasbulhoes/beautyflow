"use server";

import { redirect } from "next/navigation";

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

  if (!name || !businessName || !email || !password) {
    return {
      error: "Preencha todos os campos.",
    };
  }

  if (password.length < 6) {
    return {
      error: "A senha deve ter pelo menos 6 caracteres.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        business_name: businessName,
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