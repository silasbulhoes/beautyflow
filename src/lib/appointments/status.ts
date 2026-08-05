export const APPOINTMENT_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  EXPIRED: "expired",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_PAYMENT_STATUS = {
  PENDING: "pending",
  RECEIVED: "received",
  NOT_REQUIRED: "not_required",
  EXPIRED: "expired",
  REFUNDED: "refunded",
} as const;

export type AppointmentPaymentStatus =
  (typeof APPOINTMENT_PAYMENT_STATUS)[keyof typeof APPOINTMENT_PAYMENT_STATUS];
