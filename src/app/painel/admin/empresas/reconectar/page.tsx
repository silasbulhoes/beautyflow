import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReconnectForm } from "./reconnect-form";

export default function ReconnectAsaasPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Validar reconexão Asaas</h1>
        <p className="text-muted-foreground">
          Confirme a identidade da conta existente antes de substituir qualquer
          vínculo financeiro.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Etapa 1 — validação somente leitura</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconnectForm />
        </CardContent>
      </Card>
      <p className="text-sm text-amber-800">
        A etapa de persistência não está disponível nesta tela. Depois da
        validação, registre os quatro valores, revise o impacto e obtenha
        aprovação explícita antes de criar a ação que atualiza o Supabase.
      </p>
    </main>
  );
}
