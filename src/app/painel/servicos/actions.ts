"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ServiceState = {
  error?: string;
  success?: string;
};

async function obterEmpresaDoUsuario() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      companyId: null,
      error: "Sessão expirada. Entre novamente.",
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.company_id) {
    return {
      supabase,
      companyId: null,
      error: "Não foi possível identificar sua empresa.",
    };
  }

  return {
    supabase,
    companyId: profile.company_id as string,
    error: null,
  };
}

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
    Number.isNaN(depositPercentage) ||
    depositPercentage < 0 ||
    depositPercentage > 100
  ) {
    return {
      error: "O sinal deve ficar entre 0% e 100%.",
    };
  }

  const { supabase, companyId, error: companyError } =
    await obterEmpresaDoUsuario();

  if (!companyId) {
    return {
      error: companyError ?? "Empresa não encontrada.",
    };
  }

  const priceCents = Math.round(price * 100);

  const { error } = await supabase.from("services").insert({
    company_id: companyId,
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

export async function alternarStatusServico(formData: FormData) {
  const serviceId = String(formData.get("serviceId") ?? "");
  const active = String(formData.get("active")) === "true";

  if (!serviceId) {
    return;
  }

  const { supabase, companyId } = await obterEmpresaDoUsuario();

  if (!companyId) {
    return;
  }

  await supabase
    .from("services")
    .update({
      active: !active,
    })
    .eq("id", serviceId)
    .eq("company_id", companyId);

  revalidatePath("/painel/servicos");
}