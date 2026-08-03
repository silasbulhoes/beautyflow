import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { sair } from "./actions";
import { PainelNavigation } from "./painel-navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type PainelLayoutProps = {
  children: ReactNode;
};

function getAdminEmails() {
  return String(
    process.env.BEAUTYFLOW_ADMIN_EMAILS ?? "",
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default async function PainelLayout({
  children,
}: PainelLayoutProps) {
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

  const userEmail = user.email
    ?.trim()
    .toLowerCase();

  const isAdmin = Boolean(
    userEmail &&
      getAdminEmails().includes(userEmail),
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/painel"
              className="shrink-0 text-xl font-semibold"
            >
              BeautyFlow
            </Link>

            <PainelNavigation
              isAdmin={isAdmin}
              mode="desktop"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-medium">
                {name}
              </p>

              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? "Administrador"
                  : "Área profissional"}
              </p>
            </div>

            <form action={sair}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
              >
                Sair
              </Button>
            </form>
          </div>
        </div>

        <PainelNavigation
          isAdmin={isAdmin}
          mode="mobile"
        />
      </header>

      {children}
    </div>
  );
}