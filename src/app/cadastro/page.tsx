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

export default function CadastroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 text-lg font-semibold">
            BeautyFlow
          </Link>

          <CardTitle>Crie sua conta</CardTitle>

          <CardDescription>
            Comece a organizar seus agendamentos em poucos minutos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                name="name"
                placeholder="Digite seu nome"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Nome do estúdio</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="Ex.: Studio Bella Nails"
              />
            </div>

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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Crie uma senha"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full">
              Criar conta
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já possui uma conta?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}