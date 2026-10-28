#!/usr/bin/env bash

# Script para atualizar o projeto a partir do template (stub) upstream.
# Este script assume que o remote 'upstream' está configurado apontando para o repositório original
# e que existe uma branch local para rastrear o template (ex: template-base ou clean-project-AI-workflow).

# Configurações
UPSTREAM_URL="https://github.com/GuilianoRangel/UEG-CET-PROGWEB1-20261-monorepo-ueg.git"
TEMPLATE_BRANCH="clean-project-AI-workflow"
LOCAL_TEMPLATE_BRANCH="template-base"

echo "=== Iniciando atualização a partir do template base (stub) ==="

# Verifica se o remote 'upstream' existe, caso contrário adiciona
if ! git remote | grep -q "^upstream$"; then
    echo "Adicionando remote 'upstream' apontando para $UPSTREAM_URL..."
    git remote add upstream "$UPSTREAM_URL"
fi

# Salva a branch atual
CURRENT_BRANCH=$(git branch --show-current)
echo "Sua branch ativa atual é: $CURRENT_BRANCH"

# Verifica se há alterações não salvas
if ! git diff-index --quiet HEAD --; then
    echo "ERRO: Você possui alterações não salvas (unstaged ou uncommitted)."
    echo "Por favor, faça commit delas ou salve com 'git stash' antes de rodar o script."
    exit 1
fi

echo "Buscando atualizações do upstream..."
git fetch upstream

# Verifica se a branch local de tracking do template existe, se não, cria a partir do upstream
if ! git show-ref --verify --quiet "refs/heads/$LOCAL_TEMPLATE_BRANCH"; then
    echo "Criando branch local de tracking '$LOCAL_TEMPLATE_BRANCH' a partir de upstream/$TEMPLATE_BRANCH..."
    git checkout -b "$LOCAL_TEMPLATE_BRANCH" "upstream/$TEMPLATE_BRANCH"
else
    echo "Atualizando branch '$LOCAL_TEMPLATE_BRANCH'..."
    git checkout "$LOCAL_TEMPLATE_BRANCH"
    git pull upstream "$TEMPLATE_BRANCH"
fi

# Volta para a branch original do usuário
git checkout "$CURRENT_BRANCH"

# Mescla as alterações do template na branch atual
echo "Mesclando as alterações de '$LOCAL_TEMPLATE_BRANCH' na sua branch atual '$CURRENT_BRANCH'..."
if git merge "$LOCAL_TEMPLATE_BRANCH" -m "merge: mesclando atualizações do template upstream"; then
    echo "=== Atualização concluída com sucesso! ==="
else
    echo "=== Conflitos detectados! Por favor, resolva os conflitos manualmente e finalize o commit. ==="
fi
