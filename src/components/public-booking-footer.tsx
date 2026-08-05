import Link from "next/link";

export function PublicBookingFooter() {
  return (
    <footer className="mt-12 border-t bg-background/70 px-4 py-6 text-center text-xs text-muted-foreground">
      <p>Agendamento realizado com BeautyFlow.</p>
      <p className="mt-1">Você também trabalha com beleza? <Link href="/planos" className="font-medium text-foreground underline-offset-4 hover:underline">Conheça nossos planos</Link>.</p>
    </footer>
  );
}
