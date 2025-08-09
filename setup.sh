#!/bin/bash

# Cores para o terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
NC='\033[0m' # Sem cor

echo -e "${CYAN}\n🚀 Iniciando o setup do projeto ZapNode...\n${NC}"

# Verificações
missing=()

echo -e "${YELLOW}🔍 Verificando dependências...${NC}"

# Verifica git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git não encontrado!${NC}"
    echo -e "👉 Instale em: ${CYAN}https://git-scm.com/downloads${NC}"
    missing+=("git")
else
    echo -e "${GREEN}✔ Git encontrado${NC}"
fi

# Verifica node
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo -e "👉 Instale em: ${CYAN}https://nodejs.org/${NC}"
    missing+=("node")
else
    echo -e "${GREEN}✔ Node.js encontrado${NC}"
fi

# Verifica npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado!${NC}"
    echo -e "👉 Instale com o Node.js: ${CYAN}https://nodejs.org/${NC}"
    missing+=("npm")
else
    echo -e "${GREEN}✔ npm encontrado${NC}"
fi

# Se faltam dependências, aborta
if [ ${#missing[@]} -ne 0 ]; then
    echo -e "\n${RED}⚠ Não foi possível continuar. Instale os itens acima e tente novamente.${NC}"
    exit 1
fi

# Clonando o repositório
echo -e "\n${YELLOW}📦 Clonando o repositório zapnode...${NC}"
if [ -d "zapnode" ]; then
    echo -e "${YELLOW}⚠ Diretório 'zapnode' já existe. Pulando clonagem.${NC}"
else
    git clone https://github.com/RibasSu/zapnode.git
fi

cd zapnode || { echo -e "${RED}❌ Erro ao entrar no diretório zapnode.${NC}"; exit 1; }

# Função para perguntar e garantir que o valor não está vazio
perguntar() {
    local var_name=$1
    local prompt=$2
    local valor=""
    while [ -z "$valor" ]; do
        read -p "$prompt: " valor
        if [ -z "$valor" ]; then
            echo -e "${RED}⚠ Esse campo é obrigatório.${NC}"
        fi
    done
    eval "$var_name=\"$valor\""
}

# Criar .env com perguntas
echo -e "\n${YELLOW}🛠️  Configurando o arquivo .env...${NC}"

perguntar PORT           "🔹 Qual porta deseja usar (ex: 3000)"
perguntar CHATWOOT_URL   "🔹 Qual a URL base do Chatwoot (ex: https://app.chatwoot.com)"
perguntar CHATWOOT_ACCOUNT_ID "🔹 Qual o ID da conta no Chatwoot"
perguntar CHATWOOT_API_TOKEN  "🔹 Qual o token da API"
perguntar CHATWOOT_INBOX_ID   "🔹 Qual o ID da inbox"

# Criar o .env
cat <<EOF > .env
PORT=${PORT}
CHATWOOT_URL=${CHATWOOT_URL}
CHATWOOT_ACCOUNT_ID=${CHATWOOT_ACCOUNT_ID}
CHATWOOT_API_TOKEN=${CHATWOOT_API_TOKEN}
CHATWOOT_INBOX_ID=${CHATWOOT_INBOX_ID}
EOF

echo -e "${GREEN}✔ Arquivo .env criado com sucesso!${NC}"

# Criar diretório db
echo -e "\n${YELLOW}📁 Criando diretório 'db'...${NC}"
mkdir -p db && echo -e "${GREEN}✔ Diretório 'db' criado${NC}"

# Instalar dependências
echo -e "\n${YELLOW}📦 Instalando dependências do projeto...${NC}"
npm install && echo -e "${GREEN}✔ Dependências instaladas com sucesso${NC}"

# Mensagem final
echo -e "\n${CYAN}✅ Setup finalizado com sucesso!${NC}"
echo -e "${CYAN}👉 Para iniciar o projeto, execute: ${GREEN}npm start${NC}\n"