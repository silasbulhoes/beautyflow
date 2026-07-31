"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RescheduleState = {
  error?: string;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

export async function remarcarAgendamento(
  appointmentId: string,
  _previousState: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  void _previousState;

  const appointmentDate = String(
    formData.get("appointmentDate") ?? "",
  ).trim();

  const scheduleId = String(
    formData.get("scheduleId") ?? "",
  ).trim();

  if (
    !appointmentDate ||
    !scheduleId ||
    !isValidDateString(appointmentDate)
  ) {
    return {
      error: "Escolha uma data e um horário.",
    };
  }

  const selectedDate = parseLocalDate(appointmentDate);

  if (Number.isNaN(selectedDate.getTime())) {
    return {
      error: "A data escolhida é inválida.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateAtMidnight = new Date(selectedDate);
  selectedDateAtMidnight.setHours(0, 0, 0, 0);

  if (selectedDateAtMidnight < today) {
    return {
      error: "Não é possível remarcar para uma data passada.",
    };
  }

  const authenticatedSupabase = await createClient();

  const {
    data: { user },
  } = await authenticatedSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await authenticatedSupabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return {
      error: "Não foi possível identificar sua empresa.",
    };
  }

  const adminSupabase = createAdminClient();

  const { data: appointment } = await adminSupabase
    .from("appointments")
    .select(`
      id,
      company_id,
      status,
      payment_status
    `)
    .eq("id", appointmentId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!appointment) {
    return {
      error: "Agendamento não encontrado.",
    };
  }

  if (
    appointment.status !== "confirmed" &&
    appointment.status !== "pending_payment"
  ) {
    return {
      error: "Este agendamento não pode mais ser remarcado.",
    };
  }

  const { data: schedule } = await adminSupabase
    .from("business_hours")
    .select(`
      id,
      company_id,
      weekday,
      start_time,
      end_time,
      active
    `)
    .eq("id", scheduleId)
    .eq("company_id", profile.company_id)
    .eq("active", true)
    .maybeSingle();

  if (!schedule) {
    return {
      error: "O horário escolhido não foi encontrado.",
    };
  }

  if (selectedDate.getDay() !== schedule.weekday) {
    return {
      error: "O horário não corresponde ao dia escolhido.",
    };
  }

  await adminSupabase
    .from("appointments")
    .update({
      status: "expired",
      payment_status: "expired",
    })
    .eq("company_id", profile.company_id)
    .eq("appointment_date", appointmentDate)
    .eq("business_hour_id", schedule.id)
    .eq("status", "pending_payment")
    .neq("id", appointment.id)
    .lt("expires_at", new Date().toISOString());

  const { data: occupiedAppointment } = await adminSupabase
    .from("appointments")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("appointment_date", appointmentDate)
    .eq("business_hour_id", schedule.id)
    .in("status", ["pending_payment", "confirmed"])
    .neq("id", appointment.id)
    .maybeSingle();

  if (occupiedAppointment) {
    return {
      error:
        "Este horário já está ocupado. Escolha outro horário.",
    };
  }

  const { error: updateError } = await adminSupabase
    .from("appointments")
    .update({
      appointment_date: appointmentDate,
      business_hour_id: schedule.id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,

      // Mantém status e pagamento atuais.
      status: appointment.status,
      payment_status: appointment.payment_status,
    })
    .eq("id", appointment.id)
    .eq("company_id", profile.company_id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        error:
          "Este horário acabou de ser ocupado. Escolha outro.",
      };
    }

    console.error(
      "Erro ao remarcar agendamento:",
      updateError,
    );

    return {
      error: "Não foi possível remarcar o atendimento.",
    };
  }

  revalidatePath("/painel/agenda");
  revalidatePath(`/painel/agenda/${appointment.id}`);

  redirect(
    `/painel/agenda?mes=${appointmentDate.slice(
      0,
      7,
    )}&dia=${appointmentDate}`,
  );
}