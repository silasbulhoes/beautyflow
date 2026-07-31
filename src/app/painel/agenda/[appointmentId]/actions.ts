"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppointmentActionState = {
  error?: string;
};

export async function cancelarAgendamento(
    appointmentId: string,
    _previousState: AppointmentActionState,
    _formData: FormData,
  ): Promise<AppointmentActionState> {
    void _previousState;
    void _formData;
  
    const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
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
      appointment_date,
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

  if (appointment.status === "canceled") {
    return {
      error: "Este agendamento já está cancelado.",
    };
  }

  if (appointment.status === "expired") {
    return {
      error: "Este agendamento já expirou.",
    };
  }

  const paymentWasReceived =
    appointment.payment_status === "received";

  const { error: updateError } = await adminSupabase
    .from("appointments")
    .update({
      status: "canceled",

      /*
       * Se o sinal ainda não foi pago, registramos o pagamento
       * como cancelado. Se já foi recebido, preservamos "received",
       * porque cancelar o atendimento não significa estornar
       * automaticamente o dinheiro.
       */
      payment_status: paymentWasReceived
        ? "received"
        : "canceled",
    })
    .eq("id", appointment.id)
    .eq("company_id", profile.company_id);

  if (updateError) {
    console.error(
      "Erro ao cancelar agendamento:",
      updateError,
    );

    return {
      error: "Não foi possível cancelar o agendamento.",
    };
  }

  revalidatePath("/painel/agenda");

  redirect(
    `/painel/agenda?mes=${appointment.appointment_date.slice(
      0,
      7,
    )}&dia=${appointment.appointment_date}`,
  );
}