# Guia de Atualização do Projeto a partir do Template (Stub)

Este documento descreve como manter o seu projeto derivado atualizado com as melhorias e correções feitas no repositório de template base (stub).

## Estrutura do Git para Atualizações

Para conseguir puxar atualizações do template sem bagunçar o histórico do seu projeto, estruturamos os remotes e as branches da seguinte forma:

* **Remotes**:
  * `origin`: Aponta para o seu repositório privado/específico do projeto.
  * `upstream`: Aponta para o repositório original do stub (`https://github.com/GuilianoRangel/UEG-CET-PROGWEB1-20261-monorepo-ueg.git`).
* **Branches**:
  * `template-base`: Branch local dedicada a rastrear o estado da branch `clean-project-AI-workflow` do `upstream`. Não deve receber commits diretos de desenvolvimento.
  * `main` (ou outra branch de trabalho): Sua branch de desenvolvimento ativa.

---

## Como Atualizar Automaticamente (Script)

Disponibilizamos o script [update-template.sh](file:///home/guiliano/workspace/monorepo-ueg2/scripts/update-template.sh) para automatizar esse fluxo.

### Executando o Script:
1. Certifique-se de que não possui alterações pendentes (`git status`).
2. Execute o script a partir da raiz do repositório:
   ```bash
   bash scripts/update-template.sh
   ```

O script irá:
1. Adicionar o remote `upstream` caso ele não exista.
2. Fazer o `fetch` das novidades do template base.
3. Atualizar a branch `template-base` local com a versão mais recente do `upstream`.
4. Voltar para a sua branch atual e mesclar (`git merge`) a branch `template-base` nela.

---

## Como Atualizar Manualmente (Passo a Passo)

Caso prefira executar o fluxo de atualização manualmente, siga os comandos abaixo a partir da sua branch de desenvolvimento ativa:

### 1. Salvar alterações pendentes
Garanta que seu diretório de trabalho está limpo:
```bash
git stash
```

### 2. Buscar novidades do upstream e atualizar a branch de tracking
```bash
git fetch upstream
git checkout template-base
git pull upstream clean-project-AI-workflow
```

### 3. Mesclar as atualizações na sua branch de desenvolvimento
```bash
git checkout main  # Ou sua branch ativa
git merge template-base
```

### 4. Resolver conflitos (se houver)
Caso existam conflitos de merge, o Git indicará quais arquivos precisam de atenção. Abra os arquivos, resolva os conflitos, adicione e faça o commit:
```bash
git add .
git commit -m "merge: resolvendo conflitos da atualização do template"
```

### 5. Restaurar alterações pendentes (se usou stash)
```bash
git stash pop
```
