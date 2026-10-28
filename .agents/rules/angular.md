# Angular Rules

- **Angular 21+**: Utilização obrigatória da versão 21+ com novas sintaxes de controle de fluxo e APIs modernas de reatividade. (Consulte a Skill [angular-dev](../skills/angular-dev/SKILL.md) para padrões de desenvolvimento avançados).
- **Standalone Components**: Obrigatório. Não utilizar NgModules.
- **TailwindCSS v4**: Estilização obrigatória baseada nos tokens globais e utilitários do Tailwind v4.
- **Design System UEG**: Mandatório seguir estritamente as especificações de `specs/design-system.md` (Consulte também [tailwind-design-system](../skills/tailwind-design-system/SKILL.md) e [frontend-design](../skills/frontend-design/SKILL.md) para padrões visuais).
- **Reactive Forms**: Uso mandatório de formulários reativos (`ReactiveFormsModule`), fortemente tipados.
- **Signals**: Uso preferencial de Signals para controle de estado reativo, computado e local.
- **🚫 Proibição Estrita de `any`**: Proibido o uso de `any` em propriedades, métodos, inputs, outputs ou serviços. Use interfaces e tipos estritos.
- **TDD / Vitest**: Todo componente ou serviço de negócio deve conter cobertura de testes unitários escrita com Vitest e TestBed. (Consulte a Skill [angular-testing](../skills/angular-testing/SKILL.md) para técnicas de mock e testes de reatividade).

---

## 🎨 1. Design System e Estilização (TailwindCSS v4)
* **Componentes UI Compartilhados**: Toda interface deve ser montada a partir dos componentes atômicos em `apps/frontend/src/app/shared/components/ui/`:
  - **Botões**: `<button ui-button>` ou `<a ui-button>` com atributos `variant` e `size`.
  - **Inputs**: `<ui-input>` integrado ao formulário reativo via `ControlValueAccessor`.
  - **Cartões**: Estruturação de blocos de informação usando `<ui-card>`, `<ui-card-header>`, `<ui-card-title>` e `<ui-card-content>`.
  - **Badges**: `<ui-badge>` para exibição de status.
* **Layout Shell**: Telas restritas devem herdar e rodar dentro do layout de App Shell (`shell.component.ts`), utilizando `<ui-header>` e `<ui-sidebar>`.
* **Proibição de Cores Hardcoded**: Fica proibido utilizar classes de cores explícitas no HTML (ex: `bg-gray-900`, `text-green-500`) se houver um token correspondente no design system (utilize `bg-background`, `bg-card`, `text-primary`, etc.).
* **Uso de SCSS**: O projeto está configurado para utilizar **SCSS** (`schematics.style: "scss"`). Estilos locais complexos que não puderem ser resolvidos via Tailwind v4 devem ser definidos em arquivos `.scss` específicos do componente e associados via `styleUrl`.
* **Utilitário `cn`**: Sempre use a função helper `cn()` (em `utils/cn.util.ts`) para lidar com a concatenação condicional de classes Tailwind sem causar conflito de classes.

---

## 🏗️ 2. Componentização e Estrutura
- **Estrutura por Domínio**: Organizar o código por módulo/feature (ex: `features/users/`) agrupando componentes, rotas, modelos e serviços correspondentes.
- **Padronização de Nomes**:
  - Listagem: `entity-list.component.ts`
  - Formulário: `entity-form.component.ts`
  - Detalhe: `entity-detail.component.ts`
  - Filtros: `entity-filter.component.ts`
  - Card: `entity-card.component.ts`
  - Modal/Diálogo: `entity-dialog.component.ts`
- **Containers vs Presentational Components**:
  - **Containers (Smart)**: Interagem com serviços, gerenciam estado de carregamento/erro, buscam dados da API.
  - **Presentational (Dumb)**: Recebem dados via `@Input` (ou novas APIs de `input()`), emitem ações via `@Output` (ou `output()`), e cuidam puramente de visualização.

---

## 🛜 3. Reatividade e Comunicação HTTP
* **Angular Signals**:
  - Usar `signal()` para valores de estado locais mutáveis.
  - Usar `computed()` para criar valores derivados puros. Evitar lógica complexa no template.
  - Usar `effect()` apenas para efeitos colaterais de sincronização que não alterem outros signals.
* **HttpClient**: Services de API devem centralizar todas as requisições HTTP para o backend. Nunca monte caminhos HTTP ou strings de URL diretamente nos componentes.
* **Tratamento de Erros**: Consumir a função utilitária `parseAuthError()` para formatar códigos de erro do backend em mensagens de UI claras.
* **Feedback (ToastService)**: Injetar o `ToastService` (`import { ToastService } from '../shared/components/ui/toast.service'`) para emitir mensagens temporárias de feedback rápido (`success()`, `error()`, `info()`). Não use `alert()` ou `confirm()` nativos do navegador.

---

## 📝 4. Formulários
* **Reactive Forms Obrigatório**: Não utilize formulários template-driven.
* **Validações Explícitas**: Definir regras de validação (como `Validators.required`, `Validators.email`) de forma nítida.
* **Feedback Visual**: Exibir mensagens de erro individuais e contextualizadas em cada campo inválido.
* **Segurança de Ações**: Manter o botão de submissão do formulário devidamente desabilitado enquanto os campos forem inválidos ou uma requisição estiver sendo processada.

---

## 🧪 5. Testes Unitários e de Integração (Vitest)
* **Vitest + TestBed**: Toda lógica de tela, ativação de signals e chamadas HTTP deve ser validada por testes.
* **Simulação de Requisições**: Utilizar `HttpTestingController` para simular as payloads de sucesso e falha da API.
* **Fluxos de Navegação**: Utilizar `RouterTestingHarness` para testar se os guards barram usuários ou reúnem dados como esperado.
* **Performance**: Usar `ChangeDetectionStrategy.OnPush` para melhorar o tempo de renderização e testar a integridade sob detecção de mudanças OnPush.
* **Diretrizes Detalhadas**: Para padrões detalhados de mock de injeção de dependência e de HTTP no frontend, consulte a Skill [angular-testing/SKILL.md](../skills/angular-testing/SKILL.md).
