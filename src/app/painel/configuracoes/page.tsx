import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { EmailForm, PasswordForm, ProfileForm } from "./settings-forms";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("name, company_id, companies(name, phone, instagram)").eq("id", user.id).single();
  const company = Array.isArray(profile?.companies) ? profile.companies[0] : profile?.companies;
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6"><div><h1 className="text-2xl font-semibold">Configurações</h1><p className="text-muted-foreground">Atualize seu perfil e proteja sua conta.</p></div><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Dados pessoais e comerciais exibidos no BeautyFlow.</CardDescription></CardHeader><CardContent><ProfileForm name={profile?.name ?? ""} businessName={company?.name ?? ""} phone={company?.phone ?? ""} instagram={company?.instagram ?? ""} /></CardContent></Card><Card><CardHeader><CardTitle>Segurança</CardTitle><CardDescription>Use uma senha exclusiva com pelo menos oito caracteres.</CardDescription></CardHeader><CardContent className="space-y-6"><PasswordForm /><EmailForm email={user.email ?? ""} /></CardContent></Card></div></main>;
}
