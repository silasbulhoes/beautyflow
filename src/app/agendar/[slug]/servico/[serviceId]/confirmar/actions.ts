"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

export type ConfirmationState = {
  error?: string;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCpfCnpjLength(value: string) {
  return value.length === 11 || value.length === 14;
}

export async function confirmarAgendamento(
  slug: string,
  serviceId: string,
  scheduleId: string,
  appointmentDate: string,
  _previousState: ConfirmationState,
  formData: FormData,
): Promise<ConfirmationState> {
  const name = String(formData.get("name") ?? "").trim();

  const cpfCnpj = onlyDigits(
    String(formData.get("cpfCnpj") ?? ""),
  );

  const phone = String(formData.get("phone") ?? "").trim();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!name || !cpfCnpj || !phone) {
    return {
      error: "Preencha o nome, o CPF e o WhatsApp.",
    };
  }

  if (!isValidCpfCnpjLength(cpfCnpj)) {
    return {
      error: "Informe um CPF ou CNPJ válido.",
    };
  }

  if (!isValidDateString(appointmentDate)) {
    return {
      error: "Data inválida.",
    };
  }

  const selectedDate = parseLocalDate(appointmentDate);

  if (Number.isNaN(selectedDate.getTime())) {
    return {
      error: "Data inválida.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateAtMidnight = new Date(selectedDate);
  selectedDateAtMidnight.setHours(0, 0, 0, 0);

  if (selectedDateAtMidnight < today) {
    return {
      error: "A data escolhida já passou.",
    };
  }

  /*
   * Esta ação roda somente no servidor.
   * O cliente administrativo é usado para verificar e criar
   * a reserva sem depender de permissões públicas do navegador.
   */
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!company) {
    return {
      error: "Estúdio não encontrado.",
    };
  }

  const { data: service } = await supabase
    .from("services")
    .select(
      "id, company_id, price_cents, deposit_percentage, active",
    )
    .eq("id", serviceId)
    .eq("company_id", company.id)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    return {
      error: "Serviço não encontrado.",
    };
  }

  const { data: schedule } = await supabase
    .from("business_hours")
    .select(
      "id, company_id, weekday, start_time, end_time, active",
    )
    .eq("id", scheduleId)
    .eq("company_id", company.id)
    .eq("active", true)
    .maybeSingle();

  if (!schedule) {
    return {
      error: "Horário não encontrado.",
    };
  }

  if (selectedDate.getDay() !== schedule.weekday) {
    return {
      error: "A data não corresponde ao horário selecionado.",
    };
  }

  /*
   * Libera uma reserva pendente cujo tempo para pagamento
   * já terminou.
   */
  await supabase
    .from("appointments")
    .update({
      status: "expired",
      payment_status: "expired",
    })
    .eq("company_id", company.id)
    .eq("appointment_date", appointmentDate)
    .eq("business_hour_id", schedule.id)
    .eq("status", "pending_payment")
    .lt("expires_at", new Date().toISOString());

  /*
   * Verificação amigável antes da inserção.
   * O índice único do banco continua sendo a proteção definitiva.
   */
  const { data: occupiedAppointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("company_id", company.id)
    .eq("appointment_date", appointmentDate)
    .eq("business_hour_id", schedule.id)
    .in("status", ["pending_payment", "confirmed"])
    .maybeSingle();

  if (occupiedAppointment) {
    return {
      error:
        "Este horário acabou de ser reservado. Volte e escolha outro horário.",
    };
  }

  const clientId = randomUUID();
  const appointmentId = randomUUID();

  const { error: clientError } = await supabase
    .from("clients")
    .insert({
      id: clientId,
      company_id: company.id,
      name,
      cpf_cnpj: cpfCnpj,
      phone,
      email: email || null,
    });

  if (clientError) {
    console.error("Erro ao criar cliente:", clientError);

    return {
      error: "Não foi possível salvar os dados da cliente.",
    };
  }

  const depositAmount = Math.round(
    service.price_cents *
      (service.deposit_percentage / 100),
  );

  const remainingAmount =
    service.price_cents - depositAmount;

  const expiresAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();

  const { error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      id: appointmentId,
      company_id: company.id,
      client_id: clientId,
      service_id: service.id,
      business_hour_id: schedule.id,
      appointment_date: appointmentDate,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      status: "pending_payment",
      total_amount_cents: service.price_cents,
      deposit_amount_cents: depositAmount,
      remaining_amount_cents: remainingAmount,
      expires_at: expiresAt,
    });

  if (appointmentError) {
    /*
     * Remove o cliente criado para não deixar um registro órfão
     * quando outra pessoa reservou o horário simultaneamente.
     */
    await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (appointmentError.code === "23505") {
      return {
        error:
          "Este horário acabou de ser reservado. Volte e escolha outro horário.",
      };
    }

    console.error(
      "Erro ao criar agendamento:",
      appointmentError,
    );

    return {
      error: "Não foi possível criar o agendamento.",
    };
  }

  redirect(
    `/agendar/${slug}/pagamento/${appointmentId}`,
  );
}