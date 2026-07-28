import { redirect } from "next/navigation";

import { sair } from "./actions";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "Profissional";

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-xl font-semibold">
            BeautyFlow
          </span>

          <form action={sair}>
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">
          Olá, {name}
        </h1>

        <p className="mt-2 text-muted-foreground">
          Este é o seu painel do BeautyFlow.
        </p>
      </div>
    </main>
  );
}