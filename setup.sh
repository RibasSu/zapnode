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
    git clone https://github.com/gabrielfroes/zapnode.git
fi

cd zapnode || { echo -e "${RED}❌ Erro ao entrar no diretório zapnode.${NC}"; exit 1; }

# Criar .env com perguntas
echo -e "\n${YELLOW}🛠️  Configurando o arquivo .env...${NC}"

read -p "🔹 Qual porta deseja usar? [3000]: " PORT
PORT=${PORT:-3000}

read -p "🔹 Qual a URL base do Chatwoot (ex: https://meuchatwoot.com)? " CHATWOOT_URL
read -p "🔹 Qual o ID da conta no Chatwoot? " CHATWOOT_ACCOUNT_ID
read -p "🔹 Qual o token da API? " CHATWOOT_API_TOKEN
read -p "🔹 Qual o ID da inbox? " CHATWOOT_INBOX_ID

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