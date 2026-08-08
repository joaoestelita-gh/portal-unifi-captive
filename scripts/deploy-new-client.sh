#!/bin/bash
# =============================================================================
# Script de Deploy — Novo Cliente CenterNet
#
# Uso: ./scripts/deploy-new-client.sh
#
# Este script configura uma nova instância do Portal CenterNet em um servidor.
# Execute na máquina AWS (Lightsail/EC2) após conectar via SSH.
# =============================================================================

set -e

echo "====================================="
echo "  CenterNet Portal — Setup Cliente"
echo "====================================="
echo ""

# --- Variáveis ---
read -p "Nome do cliente (ex: prefeitura, colegio): " CLIENT_NAME
read -p "Domínio (ex: portal-prefeitura.centernet.inf.br): " DOMAIN
read -p "DATABASE_URL (Neon): " DATABASE_URL
read -p "BETTER_AUTH_SECRET (gere com: openssl rand -base64 32): " AUTH_SECRET
read -p "CRON_SECRET (qualquer string segura): " CRON_SECRET

echo ""
echo "Configurando cliente: $CLIENT_NAME"
echo "Domínio: $DOMAIN"
echo ""

# --- Criar diretório ---
APP_DIR="/opt/centernet/$CLIENT_NAME"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# --- Criar .env ---
cat > .env << EOF
# Portal CenterNet — $CLIENT_NAME
# Gerado em: $(date)

# Banco de dados (Neon PostgreSQL)
DATABASE_URL="$DATABASE_URL"

# Autenticação
BETTER_AUTH_SECRET="$AUTH_SECRET"

# Cron
CRON_SECRET="$CRON_SECRET"

# Admin inicial (altere após primeiro login)
ADMIN_EMAIL="admin@$DOMAIN"
ADMIN_PASSWORD="CenterNet@2024"
ADMIN_NAME="Administrador"
EOF

# --- Criar docker-compose ---
cat > docker-compose.yml << EOF
services:
  portal:
    image: centernet-portal:latest
    container_name: centernet-$CLIENT_NAME
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
EOF

echo ""
echo "====================================="
echo "  Setup concluído!"
echo "====================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Build da imagem (se ainda não fez):"
echo "   cd /opt/centernet && git clone https://github.com/joaoestelita-gh/portal-unifi-captive.git repo"
echo "   cd repo && docker build -t centernet-portal ."
echo ""
echo "2. Iniciar o portal:"
echo "   cd $APP_DIR && docker compose up -d"
echo ""
echo "3. Verificar se está rodando:"
echo "   docker logs centernet-$CLIENT_NAME"
echo "   curl http://localhost:3000"
echo ""
echo "4. Criar admin inicial:"
echo "   curl http://localhost:3000/api/setup"
echo ""
echo "5. Configurar Cloudflare:"
echo "   DNS A: $DOMAIN → IP deste servidor"
echo ""
echo "6. Configurar Cloud Gateway do cliente:"
echo "   Custom Portal URL: https://$DOMAIN/portal"
echo ""
echo "====================================="
