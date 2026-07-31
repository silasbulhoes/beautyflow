"use client";

import {
  Building2,
  Loader2,
  WalletCards,
} from "lucide-react";
import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  criarContaFinanceira,
  type FinancialAccountState,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FinancialAccountFormProps = {
  defaultName: string;
  defaultEmail: string;
};

const initialState: FinancialAccountState = {};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function FinancialAccountForm({
  defaultName,
  defaultEmail,
}: FinancialAccountFormProps) {
  const [state, formAction, pending] = useActionState(
    criarContaFinanceira,
    initialState,
  );

  const [documentValue, setDocumentValue] =
    useState("");

  const documentDigits = useMemo(
    () => onlyDigits(documentValue),
    [documentValue],
  );

  const isIndividual = documentDigits.length <= 11;
  const isBusiness = documentDigits.length > 11;

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <WalletCards className="size-5" />
            Dados da titular
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Informações da pessoa ou empresa que receberá os
            pagamentos.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Nome completo ou razão social
            </Label>

            <Input
              id="name"
              name="name"
              defaultValue={defaultName}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>

            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultEmail}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobilePhone">
              Celular com DDD
            </Label>

            <Input
              id="mobilePhone"
              name="mobilePhone"
              inputMode="numeric"
              placeholder="61999999999"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>

            <Input
              id="cpfCnpj"
              name="cpfCnpj"
              value={documentValue}
              onChange={(event) =>
                setDocumentValue(event.target.value)
              }
              inputMode="numeric"
              placeholder="Somente números"
              required
            />
          </div>

          {documentDigits.length > 0 &&
          isIndividual ? (
            <div className="space-y-2">
              <Label htmlFor="birthDate">
                Data de nascimento
              </Label>

              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                required
              />
            </div>
          ) : null}

          {isBusiness ? (
            <div className="space-y-2">
              <Label htmlFor="companyType">
                Tipo da empresa
              </Label>

              <select
                id="companyType"
                name="companyType"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">
                  Selecione
                </option>
                <option value="MEI">MEI</option>
                <option value="LIMITED">
                  Sociedade limitada
                </option>
                <option value="INDIVIDUAL">
                  Empresário individual
                </option>
                <option value="ASSOCIATION">
                  Associação
                </option>
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="incomeValue">
              Renda ou faturamento mensal
            </Label>

            <Input
              id="incomeValue"
              name="incomeValue"
              type="number"
              min="1"
              step="0.01"
              placeholder="5000"
              required
            />

            <p className="text-xs text-muted-foreground">
              Digite o valor mensal sem o símbolo de real.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5 border-t pt-8">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="size-5" />
            Endereço
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            O CEP precisa ser válido para o Asaas localizar
            a cidade.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">CEP</Label>

            <Input
              id="postalCode"
              name="postalCode"
              inputMode="numeric"
              placeholder="72400000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Bairro</Label>

            <Input
              id="province"
              name="province"
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Logradouro</Label>

            <Input
              id="address"
              name="address"
              placeholder="Rua, avenida ou quadra"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressNumber">Número</Label>

            <Input
              id="addressNumber"
              name="addressNumber"
              placeholder="123 ou S/N"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement">
              Complemento
            </Label>

            <Input
              id="complement"
              name="complement"
              placeholder="Sala, bloco ou apartamento"
            />
          </div>
        </div>
      </section>

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium text-amber-800">
          Ambiente de testes
        </p>

        <p className="mt-1 text-muted-foreground">
          Esta conta será criada no Asaas Sandbox. Nenhum
          dinheiro real será movimentado.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Criando conta financeira...
          </>
        ) : (
          <>
            <WalletCards className="size-4" />
            Criar conta financeira
          </>
        )}
      </Button>
    </form>
  );
}