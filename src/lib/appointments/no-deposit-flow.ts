import { APPOINTMENT_PAYMENT_STATUS, APPOINTMENT_STATUS } from "./status";

export function getInitialAppointmentPaymentState(priceInCents: number, depositPercentage: number) {
  const normalizedPercentage = Math.min(100, Math.max(0, Number(depositPercentage || 0)));
  const depositAmountCents = Math.round(priceInCents * (normalizedPercentage / 100));
  const requiresPayment = depositAmountCents > 0;
  return {
    depositAmountCents,
    remainingAmountCents: priceInCents - depositAmountCents,
    requiresPayment,
    appointmentStatus: requiresPayment ? APPOINTMENT_STATUS.PENDING_PAYMENT : APPOINTMENT_STATUS.CONFIRMED,
    paymentStatus: requiresPayment ? APPOINTMENT_PAYMENT_STATUS.PENDING : APPOINTMENT_PAYMENT_STATUS.NOT_REQUIRED,
  } as const;
}

export function getCancellationExternalOperation(paymentStatus: string | null, checkoutId: string | null) {
  const requiresRefund = paymentStatus === "received" || paymentStatus === "confirmed" || paymentStatus === "refunded";
  return {
    requiresRefund,
    shouldCancelCheckout: !requiresRefund && Boolean(checkoutId?.trim()),
  };
}

export function getCancelledAppointmentState(paymentStatus: string | null, refundCompleted: boolean) {
  return {
    status: APPOINTMENT_STATUS.CANCELLED,
    payment_status: refundCompleted ? APPOINTMENT_PAYMENT_STATUS.REFUNDED : paymentStatus,
  };
}
