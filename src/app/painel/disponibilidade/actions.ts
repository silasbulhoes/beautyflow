"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AvailabilityState = {
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

export async function adicionarHorario(
  _previousState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (
    Number.isNaN(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !startTime ||
    !endTime
  ) {
    return {
      error: "Preencha corretamente o dia e os horários.",
    };
  }

  if (endTime <= startTime) {
    return {
      error: "O horário final deve ser posterior ao horário inicial.",
    };
  }

  const { supabase, companyId, error: companyError } =
    await obterEmpresaDoUsuario();

  if (!companyId) {
    return {
      error: companyError ?? "Empresa não encontrada.",
    };
  }

  const { data: existingPeriod } = await supabase
    .from("business_hours")
    .select("id")
    .eq("company_id", companyId)
    .eq("weekday", weekday)
    .eq("start_time", startTime)
    .eq("end_time", endTime)
    .maybeSingle();

  if (existingPeriod) {
    return {
      error: "Esse período já foi cadastrado.",
    };
  }

  const { error } = await supabase.from("business_hours").insert({
    company_id: companyId,
    weekday,
    start_time: startTime,
    end_time: endTime,
    active: true,
  });

  if (error) {
    return {
      error: "Não foi possível adicionar o horário.",
    };
  }

  revalidatePath("/painel/disponibilidade");

  return {
    success: "Horário adicionado com sucesso.",
  };
}

export async function alternarStatusHorario(formData: FormData) {
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const active = String(formData.get("active")) === "true";

  if (!scheduleId) {
    return;
  }

  const { supabase, companyId } = await obterEmpresaDoUsuario();

  if (!companyId) {
    return;
  }

  await supabase
    .from("business_hours")
    .update({
      active: !active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .eq("company_id", companyId);

  revalidatePath("/painel/disponibilidade");
}

export async function excluirHorario(formData: FormData) {
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    return;
  }

  const { supabase, companyId } = await obterEmpresaDoUsuario();

  if (!companyId) {
    return;
  }

  await supabase
    .from("business_hours")
    .delete()
    .eq("id", scheduleId)
    .eq("company_id", companyId);

  revalidatePath("/painel/disponibilidade");
}