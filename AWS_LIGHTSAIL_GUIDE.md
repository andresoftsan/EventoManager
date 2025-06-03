# Deploy Workday no AWS Lightsail - Guia Completo

## Por que Lightsail é Ideal para Workday

### Vantagens:
- **Preço fixo** e previsível ($5-20/mês)
- **Mais simples** que EC2
- **PostgreSQL gerenciado** disponível
- **SSL automático** com 1 clique
- **Backup automático** incluído
- **Interface simplificada**
- **Monitoramento** básico incluído

### Custos Lightsail:
- **Instância $5/mês:** 512MB RAM, 1 vCPU, 20GB SSD
- **Instância $10/mês:** 1GB RAM, 1 vCPU, 40GB SSD (recomendado)
- **PostgreSQL $15/mês:** 1GB RAM, 20GB storage
- **Total:** $15-25/mês

## PARTE 1: Criar Instância Lightsail

### Passo 1: Acessar Lightsail

1. Vá para [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com)
2. Faça login com suas credenciais AWS
3. Clique "Create instance"

### Passo 2: Configurar Instância

**Select a platform:**
- Selecione: **Linux/Unix**

**Select a blueprint:**
- Selecione: **OS Only**
- Choose: **Ubuntu 22.04 LTS**

**Launch script (opcional):**
```bash
#!/bin/bash
# Script de instalação automática
apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
npm install -g pm2
apt install -y nginx
```

**Choose your instance plan:**
- **$5/mês:** Para testes
- **$10/mês:** Recomendado para produção
- **$20/mês:** Para alta demanda

**Identify your instance:**
- Name: `workday-server`

**Clique "Create instance"**

### Passo 3: Configurar Networking

1. **Na instância criada, clique no nome**
2. **Aba "Networking"**
3. **Firewall rules:**
   - SSH (22): Já configurado
   - HTTP (80): Clique "Add rule"
   - HTTPS (443): Clique "Add rule"
   - Custom (3000): Clique "Add rule" (temporário)

## PARTE 2: Configurar PostgreSQL

### Opção A: PostgreSQL Gerenciado Lightsail

1. **Dashboard Lightsail → Create → Database**
2. **Select a database engine:** PostgreSQL
3. **Choose a bundle:**
   - **$15/mês:** 1GB RAM, 20GB storage (recomendado)
   - **$30/mês:** 2GB RAM, 40GB storage
4. **Identify your database:**
   - Name: `workday-db`
   - Master username: `postgres`
   - Master password: (crie senha forte)
5. **Create database**

### Opção B: PostgreSQL na própria instância (mais barato)

**Conectar na instância:**
1. **Dashboard → Sua instância → Connect**
2. **Browser-based SSH** abrirá

**Instalar PostgreSQL:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Configurar PostgreSQL
sudo -u postgres psql
CREATE DATABASE workday;
CREATE USER workday_user WITH PASSWORD 'senha_muito_segura';
GRANT ALL PRIVILEGES ON DATABASE workday TO workday_user;
\q

# Configurar acesso
sudo nano /etc/postgresql/14/main/postgresql.conf
# Alterar: listen_addresses = 'localhost'

sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

## PARTE 3: Instalar e Configurar Aplicação

### Passo 4: Instalar Dependências

**No terminal SSH da instância:**

```bash
# Instalar Node.js 18 (se não instalou no launch script)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 e Nginx
sudo npm install -g pm2
sudo apt install nginx -y

# Verificar instalações
node --version
npm --version
pm2 --version
nginx -v
```

### Passo 5: Upload da Aplicação

**Opção A: Git Clone**
```bash
# Se tem repositório GitHub
git clone https://github.com/seu-usuario/workday.git
cd workday
```

**Opção B: Upload via Browser**
1. **No Lightsail Console → Sua instância**
2. **Connect using SSH → Upload files**
3. Faça upload do arquivo `workday-app.zip`
4. No terminal SSH:
```bash
unzip workday-app.zip -d workday
cd workday
```

### Passo 6: Configurar Aplicação

```bash
# Instalar dependências
npm install --production

# Configurar variáveis de ambiente
nano .env
```

**Arquivo .env:**
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=workday_lightsail_2024_super_secret_key_123456789

# Se usando PostgreSQL gerenciado:
DATABASE_URL=postgresql://postgres:sua_senha@ls-xxx.us-east-1.rds.amazonaws.com:5432/postgres

# Se usando PostgreSQL local:
DATABASE_URL=postgresql://workday_user:senha_muito_segura@localhost:5432/workday
```

### Passo 7: Configurar PM2

```bash
# Criar arquivo de configuração PM2
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'workday',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true
  }]
}
```

```bash
# Criar pasta de logs
mkdir -p /home/ubuntu/logs

# Executar migrações do banco
npm run db:push

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Verificar status
pm2 status
pm2 logs
```

### Passo 8: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/workday
```

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/workday /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## PARTE 4: Configurar Domínio e SSL

### Passo 9: IP Estático (Recomendado)

1. **Lightsail Console → Networking → Create static IP**
2. **Attach to instance:** workday-server
3. **Name:** workday-ip
4. **Create**

### Passo 10: Domínio Personalizado

**Se tem domínio próprio:**
1. **Configure DNS** no seu provedor:
   ```
   A record: seudominio.com → IP_ESTATICO_LIGHTSAIL
   CNAME: www.seudominio.com → seudominio.com
   ```

2. **Atualizar Nginx:**
```bash
sudo nano /etc/nginx/sites-available/workday
```

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    # resto da configuração igual
}
```

```bash
sudo systemctl reload nginx
```

### Passo 11: SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## PARTE 5: Backup e Monitoramento

### Passo 12: Configurar Backup

**Para PostgreSQL gerenciado:**
- Backup automático já configurado
- Retenção de 7 dias
- Point-in-time recovery disponível

**Para PostgreSQL local:**
```bash
# Script de backup
nano /home/ubuntu/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -h localhost -U workday_user workday > $BACKUP_DIR/workday_$DATE.sql

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "workday_*.sql" -mtime +7 -delete

echo "Backup realizado: workday_$DATE.sql"
```

```bash
chmod +x /home/ubuntu/backup.sh

# Backup diário às 2h
crontab -e
# Adicionar:
0 2 * * * /home/ubuntu/backup.sh
```

### Passo 13: Monitoramento Básico

**Lightsail oferece:**
- CPU utilization
- Network traffic
- Instance health
- Alertas por email

**Configurar alertas:**
1. **Console Lightsail → Sua instância**
2. **Metrics → Create alarm**
3. **Metric:** CPU utilization
4. **Threshold:** > 80%
5. **Notification:** Seu email

## Comparativo de Custos

### Lightsail vs Outras Opções:

| Serviço | Custo/mês | Complexidade | PostgreSQL | SSL | Backup |
|---------|-----------|--------------|------------|-----|--------|
| **Lightsail** | $15-25 | Baixa | Gerenciado | Manual | Auto |
| **Elastic Beanstalk** | $23-35 | Média | RDS | Auto | Auto |
| **Railway** | $15 | Muito Baixa | Incluído | Auto | Auto |
| **Render** | $14 | Muito Baixa | Incluído | Auto | Auto |

## Vantagens do Lightsail

**Para Workday:**
- **Preço fixo** sem surpresas
- **Interface simples** da AWS
- **Performance dedicada**
- **Backup confiável**
- **Escalabilidade** fácil

**Controle vs Simplicidade:**
- Mais controle que Railway/Render
- Mais simples que EC2/Elastic Beanstalk
- Custo previsível
- Suporte AWS incluído

## Troubleshooting

### Problemas Comuns:

**Aplicação não acessa:**
```bash
# Verificar se está rodando
pm2 status
pm2 logs

# Verificar Nginx
sudo systemctl status nginx
sudo nginx -t
```

**Erro de banco:**
```bash
# Testar conexão
psql -h localhost -U workday_user workday
# ou para PostgreSQL gerenciado:
psql -h ls-xxx.us-east-1.rds.amazonaws.com -U postgres postgres
```

**Erro SSL:**
```bash
# Renovar certificado
sudo certbot renew --dry-run
```

## Manutenção

### Comandos Úteis:
```bash
# Verificar recursos
htop
df -h
free -h

# Logs da aplicação
pm2 logs workday

# Restart serviços
pm2 restart workday
sudo systemctl restart nginx

# Updates do sistema
sudo apt update && sudo apt upgrade -y
```

### Updates da Aplicação:
```bash
# Fazer upload nova versão
cd workday
git pull  # ou upload manual
npm install --production
pm2 restart workday
```

## Conclusão

Lightsail é ideal se você quer:
- **Controle** sobre o servidor
- **Preço fixo** previsível  
- **Simplicidade** da AWS
- **Performance** dedicada
- **Escalabilidade** quando precisar

Com custo de $15-25/mês, oferece excelente custo-benefício para aplicações como Workday.