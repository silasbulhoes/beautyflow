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

function validarDadosDoServico(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes"));
  const price = Number(formData.get("price"));
  const depositPercentage = Number(formData.get("depositPercentage"));

  if (!name || Number.isNaN(durationMinutes) || Number.isNaN(price)) {
    return {
      data: null,
      error: "Preencha nome, duração e preço.",
    };
  }

  if (durationMinutes <= 0) {
    return {
      data: null,
      error: "A duração deve ser maior que zero.",
    };
  }

  if (price < 0) {
    return {
      data: null,
      error: "O preço não pode ser negativo.",
    };
  }

  if (
    Number.isNaN(depositPercentage) ||
    depositPercentage < 0 ||
    depositPercentage > 100
  ) {
    return {
      data: null,
      error: "O sinal deve ficar entre 0% e 100%.",
    };
  }

  return {
    data: {
      name,
      description,
      durationMinutes,
      price,
      depositPercentage,
    },
    error: null,
  };
}

export async function criarServico(
  _previousState: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  const validation = validarDadosDoServico(formData);

  if (!validation.data) {
    return {
      error: validation.error ?? "Dados inválidos.",
    };
  }

  const { supabase, companyId, error: companyError } =
    await obterEmpresaDoUsuario();

  if (!companyId) {
    return {
      error: companyError ?? "Empresa não encontrada.",
    };
  }

  const {
    name,
    description,
    durationMinutes,
    price,
    depositPercentage,
  } = validation.data;

  const { error } = await supabase.from("services").insert({
    company_id: companyId,
    name,
    description: description || null,
    duration_minutes: durationMinutes,
    price_cents: Math.round(price * 100),
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("company_id", companyId);

  revalidatePath("/painel/servicos");
}

export async function editarServico(
  serviceId: string,
  _previousState: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  if (!serviceId) {
    return {
      error: "Serviço inválido.",
    };
  }

  const validation = validarDadosDoServico(formData);

  if (!validation.data) {
    return {
      error: validation.error ?? "Dados inválidos.",
    };
  }

  const { supabase, companyId, error: companyError } =
    await obterEmpresaDoUsuario();

  if (!companyId) {
    return {
      error: companyError ?? "Empresa não encontrada.",
    };
  }

  const {
    name,
    description,
    durationMinutes,
    price,
    depositPercentage,
  } = validation.data;

  const { error } = await supabase
    .from("services")
    .update({
      name,
      description: description || null,
      duration_minutes: durationMinutes,
      price_cents: Math.round(price * 100),
      deposit_percentage: depositPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("company_id", companyId);

  if (error) {
    return {
      error: "Não foi possível atualizar o serviço.",
    };
  }

  revalidatePath("/painel/servicos");
  revalidatePath(`/painel/servicos/${serviceId}/editar`);

  return {
    success: "Serviço atualizado com sucesso.",
  };
}