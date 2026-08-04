"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConfirmationState = {
  error?: string;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

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
  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const cpfCnpj = onlyDigits(
    String(formData.get("cpfCnpj") ?? ""),
  );

  const phone = String(
    formData.get("phone") ?? "",
  ).trim();

  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const privacyAcknowledged =
    formData.get("privacyAcknowledged") === "on";

  const privacyNoticeVersion = String(
    formData.get("privacyNoticeVersion") ?? "",
  ).trim();

  if (!name || !cpfCnpj || !phone) {
    return {
      error:
        "Preencha o nome, o CPF e o WhatsApp.",
    };
  }

  if (!isValidCpfCnpjLength(cpfCnpj)) {
    return {
      error: "Informe um CPF ou CNPJ válido.",
    };
  }

  if (
    !privacyAcknowledged ||
    privacyNoticeVersion !== PRIVACY_NOTICE_VERSION
  ) {
    return {
      error:
        "Leia e confirme a ciência do Aviso de Privacidade para continuar.",
    };
  }

  if (!isValidDateString(appointmentDate)) {
    return {
      error: "Data inválida.",
    };
  }

  const selectedDate =
    parseLocalDate(appointmentDate);

  if (Number.isNaN(selectedDate.getTime())) {
    return {
      error: "Data inválida.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateAtMidnight =
    new Date(selectedDate);

  selectedDateAtMidnight.setHours(0, 0, 0, 0);

  if (selectedDateAtMidnight < today) {
    return {
      error: "A data escolhida já passou.",
    };
  }

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

  if (
    selectedDate.getDay() !== schedule.weekday
  ) {
    return {
      error:
        "A data não corresponde ao horário selecionado.",
    };
  }

  /*
   * Libera horários cujo prazo para pagamento
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
    .lt(
      "expires_at",
      new Date().toISOString(),
    );

  /*
   * Verifica se outra cliente já reservou
   * ou confirmou esse horário.
   */
  const { data: occupiedAppointment } =
    await supabase
      .from("appointments")
      .select("id")
      .eq("company_id", company.id)
      .eq(
        "appointment_date",
        appointmentDate,
      )
      .eq(
        "business_hour_id",
        schedule.id,
      )
      .in("status", [
        "pending_payment",
        "confirmed",
      ])
      .maybeSingle();

  if (occupiedAppointment) {
    return {
      error:
        "Este horário acabou de ser reservado. Volte e escolha outro horário.",
    };
  }

  const clientId = randomUUID();
  const appointmentId = randomUUID();

  const { error: clientError } =
    await supabase.from("clients").insert({
      id: clientId,
      company_id: company.id,
      name,
      cpf_cnpj: cpfCnpj,
      phone,
      email: email || null,
    });

  if (clientError) {
    console.error(
      "Erro ao criar cliente:",
      clientError,
    );

    return {
      error:
        "Não foi possível salvar os dados da cliente.",
    };
  }

  const priceInCents = Number(
    service.price_cents,
  );

  const depositPercentage = Math.min(
    100,
    Math.max(
      0,
      Number(service.deposit_percentage ?? 0),
    ),
  );

  const depositAmount = Math.round(
    priceInCents * (depositPercentage / 100),
  );

  const remainingAmount =
    priceInCents - depositAmount;

  /*
   * Quando o sinal for maior que zero,
   * o horário fica reservado por 30 minutos.
   *
   * Quando o sinal for zero,
   * o agendamento é confirmado imediatamente.
   */
  const requiresPayment = depositAmount > 0;

  const appointmentStatus = requiresPayment
    ? "pending_payment"
    : "confirmed";

  const paymentStatus = requiresPayment
    ? "pending"
    : "not_required";

  const expiresAt = requiresPayment
    ? new Date(
        Date.now() + 30 * 60 * 1000,
      ).toISOString()
    : null;

  const privacyAcknowledgedAt =
    new Date().toISOString();

  const { error: appointmentError } =
    await supabase
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

        status: appointmentStatus,
        payment_status: paymentStatus,

        total_amount_cents: priceInCents,
        deposit_amount_cents: depositAmount,
        remaining_amount_cents:
          remainingAmount,

        expires_at: expiresAt,

        privacy_notice_version:
          PRIVACY_NOTICE_VERSION,

        privacy_notice_acknowledged_at:
          privacyAcknowledgedAt,
      });

  if (appointmentError) {
    /*
     * Remove o cliente criado caso o
     * agendamento não possa ser salvo.
     */
    await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (
      appointmentError.code === "23505"
    ) {
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
      error:
        "Não foi possível criar o agendamento.",
    };
  }

  /*
   * A próxima página mostrará:
   *
   * - checkout do Asaas quando houver sinal;
   * - confirmação imediata quando o sinal for zero.
   */
  redirect(
    `/agendar/${slug}/pagamento/${appointmentId}`,
  );
}