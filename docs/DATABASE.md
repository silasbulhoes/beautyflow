# Banco de Dados do BeautyFlow

## 1. Objetivo

O banco armazenará as empresas, usuários, profissionais, clientes, serviços, disponibilidades, agendamentos e pagamentos.

O sistema será multiempresa. Os dados de uma empresa deverão permanecer isolados dos dados das demais.

---

## 2. Princípio multiempresa

As tabelas relacionadas ao negócio deverão possuir:

```text

company_id