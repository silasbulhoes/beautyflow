"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export type ResetPasswordState = { error?: string; success?: string };

export async function redefinirSenha(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (!isValidPassword(password)) {
    return { error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmation) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Este link é inválido ou expirou. Solicite uma nova recuperação." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Não foi possível atualizar a senha. Solicite um novo link e tente novamente." };
  }

  await supabase.auth.signOut();
  return { success: "Senha atualizada. Agora você já pode entrar com a nova senha." };
}
