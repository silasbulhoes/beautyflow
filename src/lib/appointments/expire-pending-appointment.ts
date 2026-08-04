import type { SupabaseClient } from "@supabase/supabase-js";

export type ExpirableAppointment = {
  id: string;
  status: string;
  expires_at: string | null;
};

type ExpirePendingAppointmentsFilters = {
  companyId: string;
  appointmentDate: string;
  businessHourId?: string;
};

function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function isPendingPaymentExpired(
  appointment: ExpirableAppointment,
  now = getCurrentTimestamp(),
): boolean {
  if (appointment.status !== "pending_payment") {
    return false;
  }

  if (!appointment.expires_at) {
    return false;
  }

  return appointment.expires_at <= now;
}

export async function expirePendingAppointmentIfDue(
  supabase: SupabaseClient,
  appointment: ExpirableAppointment,
): Promise<boolean> {
  if (!isPendingPaymentExpired(appointment)) {
    return false;
  }

  const now = getCurrentTimestamp();

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "expired",
      payment_status: "expired",
    })
    .eq("id", appointment.id)
    .eq("status", "pending_payment")
    .lte("expires_at", now)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao expirar reserva pendente:",
      error,
    );

    return false;
  }

  return Boolean(data);
}

export async function expireExpiredPendingAppointments(
  supabase: SupabaseClient,
  filters: ExpirePendingAppointmentsFilters,
): Promise<void> {
  const now = getCurrentTimestamp();

  let query = supabase
    .from("appointments")
    .update({
      status: "expired",
      payment_status: "expired",
    })
    .eq("company_id", filters.companyId)
    .eq("appointment_date", filters.appointmentDate)
    .eq("status", "pending_payment")
    .lte("expires_at", now);

  if (filters.businessHourId) {
    query = query.eq(
      "business_hour_id",
      filters.businessHourId,
    );
  }

  const { error } = await query;

  if (error) {
    console.error(
      "Erro ao expirar reservas pendentes:",
      error,
    );
  }
}

type OccupyingAppointment = {
  status: string;
  expires_at: string | null;
};

export function isAppointmentOccupyingSlot(
  appointment: OccupyingAppointment,
  now = getCurrentTimestamp(),
): boolean {
  if (appointment.status === "confirmed") {
    return true;
  }

  if (appointment.status === "pending_payment") {
    return Boolean(
      appointment.expires_at &&
        appointment.expires_at > now,
    );
  }

  return false;
}
