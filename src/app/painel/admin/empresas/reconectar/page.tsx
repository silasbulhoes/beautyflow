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
          <CardTitle>Reconexão segura em duas etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconnectForm />
        </CardContent>
      </Card>
      <p className="text-sm text-amber-800">
        A persistência exige nova validação no Asaas, prévia mascarada, confirmação explícita, MFA e auditoria. Se a auditoria não estiver disponível, nenhuma alteração será feita.
      </p>
    </main>
  );
}
