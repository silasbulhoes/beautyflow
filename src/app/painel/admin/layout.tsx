import {
    notFound,
    redirect,
  } from "next/navigation";
  import type { ReactNode } from "react";
  
  import { isAdminEmail } from "@/lib/admin-access";
  import { createClient } from "@/lib/supabase/server";
  
  type AdminLayoutProps = {
    children: ReactNode;
  };
  
  export default async function AdminLayout({
    children,
  }: AdminLayoutProps) {
    const supabase = await createClient();
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      redirect("/login");
    }
  
    if (!isAdminEmail(user.email)) {
      notFound();
    }
  
    const assuranceResult =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();
  
    if (
      assuranceResult.error ||
      assuranceResult.data.currentLevel !==
        "aal2"
    ) {
      redirect("/seguranca/mfa");
    }
  
    return children;
  }