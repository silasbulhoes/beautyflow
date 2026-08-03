import {
    CalendarDays,
    Clock3,
    LayoutDashboard,
    Scissors,
    ShieldCheck,
    UsersRound,
    WalletCards,
  } from "lucide-react";
  import Link from "next/link";
  import { redirect } from "next/navigation";
  import type { ReactNode } from "react";
  
  import { sair } from "./actions";
  
  import {
    Button,
    buttonVariants,
  } from "@/components/ui/button";
  import { createClient } from "@/lib/supabase/server";
  
  type PainelLayoutProps = {
    children: ReactNode;
  };
  
  const regularNavigationItems = [
    {
      href: "/painel",
      label: "Início",
      icon: LayoutDashboard,
    },
    {
      href: "/painel/agenda",
      label: "Agenda",
      icon: CalendarDays,
    },
    {
      href: "/painel/clientes",
      label: "Clientes",
      icon: UsersRound,
    },
    {
      href: "/painel/servicos",
      label: "Serviços",
      icon: Scissors,
    },
    {
      href: "/painel/disponibilidade",
      label: "Horários",
      icon: Clock3,
    },
    {
      href: "/painel/financeiro",
      label: "Financeiro",
      icon: WalletCards,
    },
  ];
  
  const adminNavigationItem = {
    href: "/painel/admin/subcontas",
    label: "Admin",
    icon: ShieldCheck,
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
  
    const userEmail = user.email?.trim().toLowerCase();
  
    const isAdmin = Boolean(
      userEmail &&
        getAdminEmails().includes(userEmail),
    );
  
    const navigationItems = isAdmin
      ? [
          ...regularNavigationItems,
          adminNavigationItem,
        ]
      : regularNavigationItems;
  
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
  
              <nav className="hidden items-center gap-1 lg:flex">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "gap-2",
                      })}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
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
  
          <nav className="overflow-x-auto border-t lg:hidden">
            <div className="mx-auto flex w-max min-w-full items-center px-2 py-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
  
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-w-20 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>
  
        {children}
      </div>
    );
  }