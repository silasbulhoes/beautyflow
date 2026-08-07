export const EXEMPTION_PLAN_CODES = ["free", "intermediate", "advanced"] as const;
export type ExemptionPlanCode = (typeof EXEMPTION_PLAN_CODES)[number];

export function validateExemptionAccess(context: {
  isAdmin: boolean;
  assuranceLevel: string | null;
  companyCount: number;
  subscriptionCount: number;
}) {
  if (!context.isAdmin) throw new Error("Não autorizado.");
  if (context.assuranceLevel !== "aal2") throw new Error("Confirme o segundo fator antes desta alteração.");
  if (context.companyCount !== 1) throw new Error("Empresa não encontrada ou duplicada.");
  if (context.subscriptionCount > 1) throw new Error("A empresa possui mais de uma assinatura interna.");
}

export function validateGrantInput(input: { planCode: string; activePlanCount: number; reason: string; endsAt: string; confirmation: string }) {
  if (!EXEMPTION_PLAN_CODES.includes(input.planCode as ExemptionPlanCode)) throw new Error("Plano inválido.");
  if (input.activePlanCount !== 1) throw new Error("Plano ativo não encontrado ou duplicado.");
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) throw new Error("Informe um motivo entre 5 e 500 caracteres.");
  if (input.confirmation !== "CONCEDER ISENÇÃO") throw new Error('Digite "CONCEDER ISENÇÃO" para confirmar.');
  if (input.endsAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.endsAt)) throw new Error("Data final inválida.");
  const today = new Date().toISOString().slice(0, 10);
  if (input.endsAt && input.endsAt < today) throw new Error("A data final não pode estar no passado.");
  return { planCode: input.planCode as ExemptionPlanCode, reason, endsAt: input.endsAt || null };
}

export function validateRevokeInput(input: { reason: string; confirmation: string }) {
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) throw new Error("Informe um motivo entre 5 e 500 caracteres.");
  if (input.confirmation !== "REMOVER ISENÇÃO") throw new Error('Digite "REMOVER ISENÇÃO" para confirmar.');
  return { reason };
}

export function exemptionLabel(exempt: boolean, endsAt: string | null) {
  if (!exempt) return null;
  if (!endsAt) return "Isenta permanentemente";
  const [year, month, day] = endsAt.split("-");
  return `Isenta até ${day}/${month}/${year}`;
}
