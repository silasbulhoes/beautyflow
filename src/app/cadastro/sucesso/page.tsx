import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CadastroSucessoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conta criada</CardTitle>

          <CardDescription>
            Verifique seu e-mail para confirmar o cadastro antes de entrar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Link
            href="/login"
            className={buttonVariants({ className: "w-full" })}
          >
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}