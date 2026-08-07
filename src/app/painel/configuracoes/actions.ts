"use server";

import { revalidatePath } from "next/cache";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: string };

export async function atualizarSenha(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!currentPassword) return { error: "Informe a senha atual." };
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  if (password !== confirmation) return { error: "As novas senhas não coincidem." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida. Entre novamente." };
  const verification = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verification.error) return { error: "A senha atual está incorreta." };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: "Não foi possível atualizar a senha." } : { success: "Senha atualizada com sucesso." };
}

export async function atualizarPerfil(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  if (!name || !businessName) return { error: "Informe seu nome e o nome do negócio." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida. Entre novamente." };
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) return { error: "Empresa não encontrada." };
  const admin = createAdminClient();
  const [profileResult, companyResult] = await Promise.all([
    admin.from("profiles").update({ name }).eq("id", user.id).eq("company_id", profile.company_id),
    admin.from("companies").update({ name: businessName, phone: phone || null, instagram: instagram || null }).eq("id", profile.company_id),
  ]);
  if (profileResult.error || companyResult.error) return { error: "Não foi possível atualizar o perfil." };
  await supabase.auth.updateUser({ data: { name, business_name: businessName } });
  revalidatePath("/painel", "layout");
  return { success: "Perfil atualizado com sucesso." };
}

export async function atualizarEmail(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida. Entre novamente." };
  if (user.email?.toLowerCase() === email) return { error: "Esse já é o e-mail atual." };
  const { error } = await supabase.auth.updateUser({ email });
  return error ? { error: "Não foi possível solicitar a troca de e-mail." } : { success: "Enviamos as confirmações necessárias. O e-mail só será alterado após a confirmação." };
}
