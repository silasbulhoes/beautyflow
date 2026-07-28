"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ServiceState = {
  error?: string;
  success?: string;
};

export async function criarServico(
  _previousState: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const price = Number(formData.get("price"));
  const depositPercentage = Number(formData.get("depositPercentage"));

  if (!name || !durationMinutes || Number.isNaN(price)) {
    return {
      error: "Preencha nome, duração e preço.",
    };
  }

  if (durationMinutes <= 0) {
    return {
      error: "A duração deve ser maior que zero.",
    };
  }

  if (price < 0) {
    return {
      error: "O preço não pode ser negativo.",
    };
  }

  if (
    depositPercentage < 0 ||
    depositPercentage > 100 ||
    Number.isNaN(depositPercentage)
  ) {
    return {
      error: "O sinal deve ficar entre 0% e 100%.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Sessão expirada. Entre novamente.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      error: "Não foi possível identificar sua empresa.",
    };
  }

  const priceCents = Math.round(price * 100);

  const { error } = await supabase.from("services").insert({
    company_id: profile.company_id,
    name,
    description: description || null,
    duration_minutes: durationMinutes,
    price_cents: priceCents,
    deposit_percentage: depositPercentage,
  });

  if (error) {
    return {
      error: "Não foi possível cadastrar o serviço.",
    };
  }

  revalidatePath("/painel/servicos");

  return {
    success: "Serviço cadastrado com sucesso.",
  };
}