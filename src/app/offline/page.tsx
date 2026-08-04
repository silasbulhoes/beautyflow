import {
    CloudOff,
    RefreshCw,
  } from "lucide-react";
  import Link from "next/link";
  
  import { buttonVariants } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  
  export default function OfflinePage() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
              <CloudOff className="size-7 text-muted-foreground" />
            </div>
  
            <CardTitle className="mt-4">
              Sem conexão com a internet
            </CardTitle>
  
            <CardDescription>
              O BeautyFlow precisa de internet para
              carregar dados atualizados da agenda,
              clientes e pagamentos.
            </CardDescription>
          </CardHeader>
  
          <CardContent>
            <Link
              href="/painel"
              className={buttonVariants({
                className: "w-full gap-2",
              })}
            >
              <RefreshCw className="size-4" />
              Tentar novamente
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }