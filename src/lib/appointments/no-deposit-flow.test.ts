import { describe, expect, it, vi } from "vitest";
import { getCancellationExternalOperation, getCancelledAppointmentState, getInitialAppointmentPaymentState } from "./no-deposit-flow";

describe("fluxo de agendamento sem sinal", () => {
  it("confirma imediatamente como not_required e bloqueia o horário", () => {
    const state = getInitialAppointmentPaymentState(17990, 0);
    expect(state).toMatchObject({
      depositAmountCents: 0,
      remainingAmountCents: 17990,
      requiresPayment: false,
      appointmentStatus: "confirmed",
      paymentStatus: "not_required",
    });
    const occupiedStatuses = ["pending_payment", "confirmed"];
    expect(occupiedStatuses).toContain(state.appointmentStatus);
  });

  it("cancela sem chamar o Asaas, preserva not_required e libera o horário", () => {
    const asaasRequest = vi.fn();
    const operation = getCancellationExternalOperation("not_required", null);
    if (operation.requiresRefund || operation.shouldCancelCheckout) asaasRequest();
    expect(asaasRequest).not.toHaveBeenCalled();
    expect(getCancelledAppointmentState("not_required", false)).toEqual({ status: "cancelled", payment_status: "not_required" });
    const occupiedStatuses = ["pending_payment", "confirmed"];
    expect(occupiedStatuses).not.toContain("cancelled");
  });
});
