import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { reconcilePendingPayments } from "@/lib/appointments/reconcile-payments";

export const runtime = "nodejs";

function validSecret(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.RECONCILIATION_SECRET?.trim();
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!expected || !validSecret(received, expected)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json(await reconcilePendingPayments());
  } catch (error) {
    console.error("Falha na reconciliação programada:", error instanceof Error ? error.message : "Erro desconhecido");
    return NextResponse.json({ error: "Não foi possível reconciliar os pagamentos." }, { status: 500 });
  }
}
