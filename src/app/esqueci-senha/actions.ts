"use server";

import { createClient } from "@/lib/supabase/server";
import { getApplicationUrl } from "@/lib/auth/password";
import { headers } from "next/headers";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
};

export async function solicitarRedefinicao(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = await createClient();
  const requestHeaders = await headers();
  const redirectTo = `${getApplicationUrl(requestHeaders.get("origin"))}/auth/callback?next=/redefinir-senha`;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo },
  );

  if (error) {
    console.error("Falha ao solicitar redefinição de senha:", {
      status: error.status,
      code: error.code,
    });
  }

  return {
    success:
      "Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.",
  };
}
