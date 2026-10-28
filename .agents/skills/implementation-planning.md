---
name: implementation-planning
description: Fluxo obrigatório de planejamento para especificar profundamente regras de negócio e execução técnica antes do código.
---

# Skill: Implementation Planning

Esta skill define o fluxo obrigatório de planejamento prévio antes de iniciar o desenvolvimento de qualquer nova funcionalidade. O objetivo é remover ambiguidades e preparar especificações técnicas profundas o suficiente para que até mesmo agentes LLMs menores consigam executar o código com precisão, reduzindo erros de arquitetura.

## 1. Levantamento de Dúvidas (QA) e Validação Inicial
- **Não presuma regras.** Se houver qualquer ambiguidade no pedido (ex: "quem pode fazer isso?", "o que acontece quando atinge o limite?", "é manual ou automático?"), **PARE** e faça as perguntas ao usuário através de uma seção de "Questões em Aberto".
- Aguarde o esclarecimento do usuário antes de iniciar as documentações definitivas.

## 2. Criação da Documentação de Negócio
**Local:** `specs/[nome-da-feature]/[nome-da-feature].md`

Após o alinhamento, crie um arquivo detalhado contendo obrigatoriamente:
- **Visão Geral e Atores (Roles):** Quem usa a funcionalidade e as permissões de cada ator.
- **Modelagem de Dados Estrita:** Defina as entidades do sistema com tipos primitivos exatos (UUID, Date, boolean, array de strings).
- **Regras de Negócio e Restrições:** Lógicas de unicidade, cardinalidade máxima/mínima, status calculados dinamicamente e validações de estado.
- **Requisitos de UI/UX:** Comportamentos esperados em tela (ex: bloqueio de botões, destaques visuais em itens escolhidos, alertas).

## 3. Criação do Plano de Execução (Roteiro Técnico)
**Local:** `specs/[nome-da-feature]/[nome-da-feature]-exec-plan.md`

Este documento é o mapa de implementação técnica, dividido nas fases exigidas pelo monorepo. **Ele OBRIGATORIAMENTE deve ser formatado como uma lista de tarefas em Markdown (utilizando checkboxes `- [ ]`)** para cada ação técnica, permitindo que o agente implementador marque e rastreie o progresso real da execução.

- **Fase de Contratos:** Tarefas para DTOs e Interfaces em `packages/utils`.
- **Fase de Backend:**
  - Quais rotas HTTP criar e sob quais `Roles`.
  - Quais anotações do `class-validator` devem ser usadas nos DTOs para refletir as restrições de negócio.
  - **Casos de Teste Unitário (TDD):** Liste nominalmente quais testes (`should throw X if Y...`) deverão ser desenvolvidos antes da lógica de fato.
- **Fase de Frontend:**
  - Árvore de rotas no Angular.
  - Estrutura de estado reativo a ser adotada (ex: `FormBuilder` arrays, `Signals`).
  - Chamadas de Modal customizadas (NUNCA usar `confirm()` nativo para exclusões) e interações do fluxo.

## 4. Vínculos e Hand-off
- Insira links Markdown cruzados entre o arquivo de Negócio e o arquivo de Execução.
- Apresente os dois arquivos ao usuário para aprovação final. Somente com a aprovação explícita o agente poderá transitar para a skill `new-feature` e começar a programar.
