export type PlanCode = "free" | "intermediate" | "advanced";

export type PublicPlan = {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCents: number;
  recommended: boolean;
  active: boolean;
  order: number;
  features: Array<{ label: string; available: boolean; comingSoon?: boolean }>;
};

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    code: "free", name: "Grátis", description: "Para conhecer o BeautyFlow e organizar os primeiros atendimentos.", monthlyPriceCents: 0, recommended: false, active: true, order: 1,
    features: [
      { label: "Página pública de agendamento", available: true },
      { label: "Cadastro de serviços e horários", available: true },
      { label: "Relatórios avançados", available: false, comingSoon: true },
    ],
  },
  {
    code: "intermediate", name: "Intermediário", description: "Para profissionais que já recebem sinais e acompanham a agenda diariamente.", monthlyPriceCents: 0, recommended: true, active: true, order: 2,
    features: [
      { label: "Tudo do plano Grátis", available: true },
      { label: "Sinal pelo Asaas", available: true },
      { label: "Agenda, clientes e financeiro", available: true },
      { label: "Mensalidade recorrente", available: false, comingSoon: true },
    ],
  },
  {
    code: "advanced", name: "Avançado", description: "Para negócios que desejam crescer com mais automações.", monthlyPriceCents: 0, recommended: false, active: true, order: 3,
    features: [
      { label: "Tudo do plano Intermediário", available: true },
      { label: "Reconciliação administrativa", available: true },
      { label: "Equipe e múltiplas profissionais", available: false, comingSoon: true },
    ],
  },
];

export function formatPlanPrice(cents: number) {
  if (cents === 0) return "Sem cobrança nesta fase";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
