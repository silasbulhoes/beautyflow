export const ASAAS_REFUND_STATUS = {
  PENDING: "PENDING",
  AWAITING_AUTHORIZATION: "AWAITING_CRITICAL_ACTION_AUTHORIZATION",
  CANCELLED: "CANCELLED",
  DONE: "DONE",
} as const;

export type AsaasRefund = {
  status?: string | null;
  dateCreated?: string | null;
  value?: number | null;
  description?: string | null;
  transactionReceiptUrl?: string | null;
};

export type RefundDisplayState =
  | "not_requested"
  | "requested"
  | "awaiting_authorization"
  | "processing"
  | "cancelled"
  | "completed";

export type RefundDecision = {
  state: RefundDisplayState;
  completed: boolean;
  mayRequestAutomatically: boolean;
  shouldUpdateAppointment: boolean;
};

function normalizedStatus(refund: AsaasRefund) {
  return String(refund.status ?? "").trim().toUpperCase();
}

export function getRefundDecision(
  paymentStatus: string | null | undefined,
  refunds: AsaasRefund[],
): RefundDecision {
  const statuses = refunds.map(normalizedStatus);
  const paymentRefunded =
    String(paymentStatus ?? "").toUpperCase() === "REFUNDED";

  if (
    paymentRefunded ||
    statuses.includes(ASAAS_REFUND_STATUS.DONE)
  ) {
    return {
      state: "completed",
      completed: true,
      mayRequestAutomatically: false,
      shouldUpdateAppointment: true,
    };
  }

  if (
    statuses.includes(
      ASAAS_REFUND_STATUS.AWAITING_AUTHORIZATION,
    )
  ) {
    return {
      state: "awaiting_authorization",
      completed: false,
      mayRequestAutomatically: false,
      shouldUpdateAppointment: false,
    };
  }

  if (statuses.includes(ASAAS_REFUND_STATUS.PENDING)) {
    return {
      state: "processing",
      completed: false,
      mayRequestAutomatically: false,
      shouldUpdateAppointment: false,
    };
  }

  if (statuses.includes(ASAAS_REFUND_STATUS.CANCELLED)) {
    return {
      state: "cancelled",
      completed: false,
      mayRequestAutomatically: false,
      shouldUpdateAppointment: false,
    };
  }

  return {
    state: refunds.length > 0 ? "requested" : "not_requested",
    completed: false,
    mayRequestAutomatically: refunds.length === 0,
    shouldUpdateAppointment: false,
  };
}

export const REFUND_STATE_CONTENT: Record<
  RefundDisplayState,
  { label: string; guidance: string }
> = {
  not_requested: {
    label: "Estorno não solicitado",
    guidance: "Nenhuma operação de estorno foi encontrada.",
  },
  requested: {
    label: "Estorno solicitado",
    guidance: "O Asaas recebeu a solicitação, mas ainda não informou um estado conhecido.",
  },
  awaiting_authorization: {
    label: "Aguardando autorização",
    guidance: "Autorize a ação crítica no Asaas e depois consulte novamente. Não repita o pedido.",
  },
  processing: {
    label: "Estorno em processamento",
    guidance: "Aguarde a conclusão do Asaas. Não repita o pedido.",
  },
  cancelled: {
    label: "Estorno cancelado pelo Asaas",
    guidance: "O valor não foi devolvido. Mantenha o atendimento confirmado e procure o suporte ou registre um reembolso manual.",
  },
  completed: {
    label: "Estorno concluído",
    guidance: "A devolução foi confirmada pelo Asaas.",
  },
};
