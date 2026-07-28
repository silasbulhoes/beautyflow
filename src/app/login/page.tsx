import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 text-lg font-semibold">
            BeautyFlow
          </Link>

          <CardTitle>Entrar</CardTitle>

          <CardDescription>
            Acesse sua agenda e gerencie seus atendimentos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>

                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full">
              Entrar
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Ainda não possui uma conta?{" "}
              <Link
                href="/cadastro"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}