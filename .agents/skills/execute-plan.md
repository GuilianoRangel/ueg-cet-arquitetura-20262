---
name: execute-plan
description: Guia para execução metódica de planos de implementação técnicos, garantindo que o agente marque as tarefas concluídas (checkboxes) à medida que avança.
---

# Skill: Execute Plan (Acompanhamento de Tarefas)

Quando solicitado a implementar uma funcionalidade baseada em um plano técnico pré-existente (ex: `specs/[feature]/[feature]-exec-plan.md`), você deve atuar como um executor extremamente metódico.

## 1. Regra de Ouro do Progresso e Rastreabilidade
- Você **NÃO PODE** tentar executar múltiplas fases ou pular partes do plano de forma caótica.
- Você deve seguir a ordem estrita das Fases e Tarefas definidas no plano.
- O plano OBRIGATORIAMENTE estará formatado com checkboxes do Markdown (`- [ ]`).

## 2. Atualização Contínua do Documento
À medida que você executa o código (TDD, componentes, etc) de uma tarefa específica e confirma que os testes passaram, você **DEVE** editar o arquivo `-exec-plan.md` para marcar a tarefa como concluída (`- [x]`).

**Fluxo Obrigatório para cada Tarefa:**
1. Leia a próxima tarefa pendente (`- [ ]`) no documento.
2. Utilize as ferramentas de edição para alterar o status da tarefa para "Em progresso" (`- [/]`).
3. Execute a implementação (TDD, código da funcionalidade, refatoração e validação via comando de testes).
4. Após atestar que o código funciona e o teste passa, altere o status no arquivo para concluído (`- [x]`).
5. Repita o processo para a próxima tarefa.

## 3. Ponto de Controle (Checkpoints)
- Se você esbarrar em um erro complexo ou bloqueio arquitetural: **Atualize o documento marcando a tarefa atual como bloqueada** e peça orientação ao usuário.
- Ao finalizar seu turno, o documento deve refletir perfeitamente o progresso real até aquele instante.
