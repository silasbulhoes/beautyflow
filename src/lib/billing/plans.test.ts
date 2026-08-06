import { describe, expect, it } from "vitest";
import { formatPlanPrice, PUBLIC_PLANS } from "./plans";

describe("public plans", () => {
  it("mantém códigos únicos e ordem explícita", () => {
    expect(new Set(PUBLIC_PLANS.map((plan) => plan.code)).size).toBe(PUBLIC_PLANS.length);
    expect([...PUBLIC_PLANS].sort((a, b) => a.order - b.order).map((plan) => plan.code)).toEqual(["free", "intermediate", "advanced"]);
  });

  it("não anuncia mensalidade antes da ativação", () => {
    expect(PUBLIC_PLANS.every((plan) => plan.monthlyPriceCents === 0)).toBe(true);
    expect(formatPlanPrice(0)).toContain("Sem cobrança");
  });

  it("marca recursos futuros como indisponíveis", () => {
    const future = PUBLIC_PLANS.flatMap((plan) => plan.features).filter((feature) => feature.comingSoon);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((feature) => !feature.available)).toBe(true);
  });
});
