# Tarefas do BeautyFlow

## Sprint 1 — Fundação

- [x] Criar conta no GitHub

- [x] Instalar Git

- [x] Instalar Node.js

- [x] Instalar Cursor

- [x] Criar repositório BeautyFlow

- [x] Clonar repositório

- [x] Criar aplicação Next.js

- [x] Rodar aplicação localmente

- [x] Criar pasta de documentação

- [x] Fazer primeiro commit

- [x] Enviar projeto ao GitHub

---

## Sprint 2 — Organização técnica

- [ ] Revisar arquivos de documentação

- [ ] Atualizar README

- [ ] Criar estrutura de pastas

- [ ] Instalar shadcn/ui

- [ ] Criar primeiro componente reutilizável

- [ ] Verificar ESLint

- [ ] Verificar build de produção

---

## Sprint 3 — Supabase e banco

- [ ] Criar conta no Supabase

- [ ] Criar projeto BeautyFlow no Supabase

- [ ] Configurar variáveis de ambiente

- [ ] Instalar cliente do Supabase

- [ ] Instalar Prisma

- [ ] Criar modelo inicial do banco

- [ ] Criar primeira migration

- [ ] Testar conexão com o banco

---

## Sprint 4 — Autenticação

- [ ] Criar página de cadastro

- [ ] Criar página de login

- [ ] Criar logout

- [ ] Criar recuperação de senha

- [ ] Proteger painel

- [ ] Criar perfil da profissional

- [ ] Criar empresa vinculada à profissional

---

## Próxima tarefa

Revisar a migration `202608050001_platform_billing.sql`, validar backup/rollback e solicitar aprovação antes de aplicá-la no Supabase.

## Finalização BeautyFlow

- [x] Criar branch e patch de segurança.
- [x] Preservar correções de cancelamento/estorno.
- [x] Implementar “Esqueci minha senha” e redefinição segura.
- [x] Implementar perfil, troca de senha e solicitação de troca de e-mail.
- [x] Criar `/planos` e divulgação nas páginas públicas.
- [x] Preparar reconciliação autenticada.
- [x] Versionar schema proposto e rollback sem executar.
- [x] Documentar Asaas, billing, produção, operação e incidentes.
- [ ] Aplicar migration após aprovação.
- [ ] Marcar Studio BeautyFlow como isenta após exibir SQL/linha e obter aprovação.
- [ ] Corrigir credencial da subconta após identificar e validar a conta correta.
- [ ] Testar pagamentos e mensalidades no Sandbox com operações autorizadas.
- [x] Tratar todos os estados de refund sem falso positivo.
- [x] Preparar migration e fluxo de reembolso manual, sem aplicar.
- [ ] Aplicar e verificar `202608050002_appointment_refund_operations.sql` após aprovação.
- [ ] Repetir um único estorno real controlado antes da produção; o Sandbox cancelou seis tentativas mesmo com saldo suficiente.
