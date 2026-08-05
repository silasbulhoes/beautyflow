import { Check, Clock3, X } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanPrice, PUBLIC_PLANS } from "@/lib/billing/plans";

export default function PlansPage() {
  const plans = PUBLIC_PLANS.filter((plan) => plan.active).sort((a, b) => a.order - b.order);
  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link href="/" className="text-xl font-semibold">BeautyFlow</Link><Link href="/login" className={buttonVariants({ variant: "outline" })}>Entrar</Link></div></header>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Planos</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Comece simples e evolua no seu ritmo</h1><p className="mt-4 text-muted-foreground">A escolha registra seu interesse. Nenhuma mensalidade será cobrada enquanto a cobrança recorrente não estiver ativada.</p></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => <Card key={plan.code} className={plan.recommended ? "border-primary shadow-md" : undefined}>
            <CardHeader>{plan.recommended ? <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recomendado</p> : null}<CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription><p className="pt-3 text-lg font-semibold">{formatPlanPrice(plan.monthlyPriceCents)}</p></CardHeader>
            <CardContent className="space-y-6"><ul className="space-y-3 text-sm">{plan.features.map((feature) => <li key={feature.label} className="flex gap-2">{feature.comingSoon ? <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" /> : feature.available ? <Check className="mt-0.5 size-4 shrink-0 text-green-700" /> : <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}<span>{feature.label}{feature.comingSoon ? " — Em breve" : ""}</span></li>)}</ul><Link href={`/cadastro?plano=${plan.code}`} className={buttonVariants({ className: "w-full", variant: plan.recommended ? "default" : "outline" })}>Criar minha conta</Link></CardContent>
          </Card>)}
        </div>
      </section>
    </main>
  );
}
