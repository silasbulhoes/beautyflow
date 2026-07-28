# Regras do Projeto BeautyFlow

## 1. Regras de desenvolvimento

- Todo código deverá utilizar TypeScript.

- Não duplicar lógica ou componentes.

- Componentes devem ser pequenos e reutilizáveis.

- Nomes de arquivos, funções e variáveis devem ser claros.

- Não adicionar dependências sem necessidade.

- Não criar funcionalidades fora da tarefa atual.

- Priorizar simplicidade no MVP.

- Todo código deve passar pelo ESLint e pelo build antes do commit.

---

## 2. Regras de arquitetura

- O MVP utilizará Next.js full-stack.

- A interface nunca deverá acessar dados sensíveis diretamente.

- Regras de negócio e validações importantes deverão executar no servidor.

- Toda entidade pertencente a uma empresa deverá possuir `company_id`.

- Toda consulta deverá respeitar o isolamento entre empresas.

- Nenhuma empresa poderá acessar dados de outra.

- Integrações externas deverão ficar separadas da interface.

- Segredos deverão ser armazenados em variáveis de ambiente.

---

## 3. Regras de segurança

- Nunca salvar senhas manualmente no banco.

- Nunca enviar chaves secretas ao navegador.

- Nunca publicar arquivos `.env`.

- Validar toda entrada recebida.

- Verificar autenticação e autorização no servidor.

- Aplicar políticas de Row Level Security no Supabase.

- Webhooks de pagamento deverão validar origem e assinatura.

- Valores financeiros deverão ser calculados no servidor.

---

## 4. Regras de interface

- O sistema será mobile first.

- A experiência deverá ser simples para pessoas com pouca familiaridade com tecnologia.

- Botões principais deverão ser fáceis de identificar.

- Mensagens de erro deverão explicar como corrigir o problema.

- A interface deverá ser acessível.

- O visual deverá ser limpo, moderno e profissional.

- Evitar excesso de elementos decorativos.

---

## 5. Regras de Git

- A branch `main` deverá permanecer funcional.

- Cada alteração importante deverá gerar um commit.

- Mensagens de commit deverão explicar a mudança.

- Nunca enviar senhas, tokens ou chaves ao GitHub.

- Antes do push, executar testes, lint e build disponíveis.

---

## 6. Regras para uso de IA

Antes de escrever código, a IA deverá:

1. Ler os documentos relevantes da pasta `docs`.

2. Explicar resumidamente o que será alterado.

3. Executar apenas a tarefa solicitada.

4. Não alterar a arquitetura por conta própria.

5. Não adicionar funcionalidades não solicitadas.

6. Informar arquivos criados ou modificados.

7. Apresentar instruções para testar.

8. Informar riscos ou pontos ainda pendentes.

Código gerado por IA deverá ser revisado e testado antes de ser aceito.