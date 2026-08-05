"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarEmail, atualizarPerfil, atualizarSenha, type SettingsState } from "./actions";

const initial: SettingsState = {};

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) return <p aria-live="polite" className="text-sm text-destructive">{state.error}</p>;
  if (state.success) return <p aria-live="polite" className="text-sm text-green-700">{state.success}</p>;
  return null;
}

export function ProfileForm(props: { name: string; businessName: string; phone: string; instagram: string }) {
  const [state, action, pending] = useActionState(atualizarPerfil, initial);
  return <form action={action} className="space-y-4"><div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" name="name" defaultValue={props.name} required /></div><div className="space-y-2"><Label htmlFor="businessName">Nome do negócio</Label><Input id="businessName" name="businessName" defaultValue={props.businessName} required /></div><div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" defaultValue={props.phone} /></div><div className="space-y-2"><Label htmlFor="instagram">Instagram</Label><Input id="instagram" name="instagram" defaultValue={props.instagram} /></div><Feedback state={state} /><Button disabled={pending}>{pending ? "Salvando..." : "Salvar perfil"}</Button></form>;
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(atualizarSenha, initial);
  return <form action={action} className="space-y-4"><div className="space-y-2"><Label htmlFor="currentPassword">Senha atual</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div><div className="space-y-2"><Label htmlFor="newPassword">Nova senha</Label><Input id="newPassword" name="password" type="password" minLength={8} autoComplete="new-password" required /></div><div className="space-y-2"><Label htmlFor="confirmation">Confirmar nova senha</Label><Input id="confirmation" name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></div><Feedback state={state} /><Button disabled={pending}>{pending ? "Atualizando..." : "Alterar senha"}</Button></form>;
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(atualizarEmail, initial);
  return <form action={action} className="space-y-4 border-t pt-6"><div className="space-y-2"><Label htmlFor="newEmail">Novo e-mail</Label><Input id="newEmail" name="email" type="email" defaultValue={email} autoComplete="email" required /></div><Feedback state={state} /><Button variant="outline" disabled={pending}>{pending ? "Solicitando..." : "Alterar e-mail"}</Button></form>;
}
