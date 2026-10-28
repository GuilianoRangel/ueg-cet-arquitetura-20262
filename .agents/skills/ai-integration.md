# Skill: AI Integration

Para integrar um novo LLM, sempre:

## 0. Validação inicial (OBRIGATÓRIO)
- Verificar se foram fornecidas regras de negócio da integração:
  - Quando usar o LLM
  - Qual comportamento esperado
  - Tratamento de erro
  - Formato de resposta esperado
- Caso NÃO tenham sido fornecidas:
  - Interromper
  - Solicitar detalhes antes de continuar

## 1. Contrato e padronização
- Criar tipos em `packages/utils/src/ai/`
- Padronizar resposta com `AIResponse`

## 2. Testes primeiro (TDD obrigatório)
- Criar testes ANTES da implementação

### Backend
- Testar:
  - normalização da resposta
  - cenários de erro
  - comportamento esperado do provider

### Frontend
- Testar:
  - consumo da API
  - estados (loading, erro, sucesso)

- Testes devem refletir regras de negócio definidas

## 3. Implementação Backend (NestJS)
- Criar provider/service em `apps/backend/src/`
- Isolar integração externa
- Nunca expor secrets
- Configurar via `@nestjs/config`

- Exceções:
  - usar `BusinessException`
  - conter:
    - código interno
    - mensagem
    - HTTP code (default 400, customizável)
    - details opcional

- Tratamento global via `ExceptionFilter`

## 4. Exposição via API
- Criar endpoint no backend NestJS
- Angular consome via HTTP

## 5. Frontend (Angular)
- Nunca acessar LLM diretamente
- Usar HttpClient
- Aplicar:
  - Signals
  - Reactive Forms (se aplicável)
  - TailwindCSS

## 6. Validação final (OBRIGATÓRIO)
- Executar todos os testes após implementação
- Garantir aderência total às regras de negócio
- Nenhum teste pode falhar
- Falhou → corrigir implementação
- Entrega só é válida com todos os testes passando