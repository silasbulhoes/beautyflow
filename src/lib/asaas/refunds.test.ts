import { describe, expect, it } from "vitest";
import { getRefundDecision } from "./refunds";

describe("getRefundDecision", () => {
  it("conclui somente com refund DONE", () => {
    expect(getRefundDecision("RECEIVED", [{ status: "DONE" }])).toMatchObject({ state: "completed", completed: true, shouldUpdateAppointment: true, mayRequestAutomatically: false });
  });

  it("mantém PENDING em processamento", () => {
    expect(getRefundDecision("RECEIVED", [{ status: "PENDING" }])).toMatchObject({ state: "processing", completed: false, shouldUpdateAppointment: false, mayRequestAutomatically: false });
  });

  it("mantém autorização crítica como pendente sem duplicar", () => {
    expect(getRefundDecision("RECEIVED", [{ status: "AWAITING_CRITICAL_ACTION_AUTHORIZATION" }])).toMatchObject({ state: "awaiting_authorization", shouldUpdateAppointment: false, mayRequestAutomatically: false });
  });

  it("nunca trata CANCELLED como devolução", () => {
    expect(getRefundDecision("RECEIVED", [{ status: "CANCELLED" }])).toEqual({ state: "cancelled", completed: false, shouldUpdateAppointment: false, mayRequestAutomatically: false });
  });

  it("conclui quando o próprio pagamento está REFUNDED", () => {
    expect(getRefundDecision("REFUNDED", [])).toMatchObject({ state: "completed", shouldUpdateAppointment: true });
  });

  it("permite solicitação somente quando nunca houve refund", () => {
    expect(getRefundDecision("RECEIVED", [])).toMatchObject({ state: "not_requested", mayRequestAutomatically: true });
  });

  it("é idempotente depois de sucesso externo e falha no Supabase", () => {
    const firstRetry = getRefundDecision("RECEIVED", [{ status: "DONE" }]);
    const secondRetry = getRefundDecision("RECEIVED", [{ status: "DONE" }]);
    expect(firstRetry.shouldUpdateAppointment).toBe(true);
    expect(secondRetry.shouldUpdateAppointment).toBe(true);
    expect(secondRetry.mayRequestAutomatically).toBe(false);
  });

  it("prioriza conclusão mesmo com tentativas CANCELLED anteriores", () => {
    expect(getRefundDecision("RECEIVED", [{ status: "DONE" }, { status: "CANCELLED" }])).toMatchObject({ state: "completed", completed: true, mayRequestAutomatically: false });
  });
});
