"use client";

import {
  CalendarDays,
  Clock3,
  FileLock2,
  LayoutDashboard,
  Scissors,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

type PainelNavigationProps = {
  isAdmin: boolean;
  mode: "desktop" | "mobile";
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
  {
    href: "/painel/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

const adminNavigationItems = [
  {
    href: "/painel/admin/empresas",
    label: "Admin",
    icon: ShieldCheck,
  },
  {
    href: "/painel/admin/privacidade",
    label: "LGPD",
    icon: FileLock2,
  },
];

function isCurrentRoute(
  pathname: string,
  href: string,
) {
  if (href === "/painel") {
    return pathname === "/painel";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export function PainelNavigation({
  isAdmin,
  mode,
}: PainelNavigationProps) {
  const pathname = usePathname();

  const navigationItems = isAdmin
    ? [
        ...regularNavigationItems,
        ...adminNavigationItems,
      ]
    : regularNavigationItems;

  if (mode === "desktop") {
    return (
      <nav
        className="hidden items-center gap-1 lg:flex"
        aria-label="Navegação principal"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const isActive = isCurrentRoute(
            pathname,
            item.href,
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                isActive ? "page" : undefined
              }
              className={buttonVariants({
                variant: isActive
                  ? "secondary"
                  : "ghost",
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
    );
  }

  return (
    <nav
      className="overflow-x-auto border-t lg:hidden"
      aria-label="Navegação principal para celular"
    >
      <div className="mx-auto flex w-max min-w-full items-center gap-1 px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const isActive = isCurrentRoute(
            pathname,
            item.href,
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                isActive ? "page" : undefined
              }
              className={`flex min-w-20 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
