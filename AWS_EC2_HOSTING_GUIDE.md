# Hospedagem Workday em AWS EC2 com PostgreSQL

## Configurações e Custos

### Opção 1: EC2 + RDS (Recomendado para Produção)
**Custo mensal: $15-35**
- EC2 t3.micro: $8.50/mês
- RDS PostgreSQL t3.micro: $12.60/mês
- Storage: $2-5/mês
- Data transfer: $1-3/mês

### Opção 2: EC2 com PostgreSQL Local (Mais Econômico)
**Custo mensal: $8-15**
- EC2 t3.small: $16.80/mês (PostgreSQL + App no mesmo servidor)
- Storage: $2-5/mês
- Data transfer: $1-3/mês

### Opção 3: EC2 Spot Instance (Desenvolvimento)
**Custo mensal: $3-8**
- EC2 Spot t3.micro: $2-4/mês
- Storage: $1-2/mês
- **Atenção:** Pode ser interrompida

## Configuração Passo a Passo

### 1. Criar Instância EC2

**No Console AWS:**
1. EC2 → Launch Instance
2. **Name:** workday-server
3. **AMI:** Ubuntu Server 22.04 LTS
4. **Instance type:** 
   - t3.micro (1GB RAM) - para testes
   - t3.small (2GB RAM) - recomendado
5. **Key pair:** Criar nova (download .pem)
6. **Security Group:** Criar nova
   - SSH (22): Seu IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom (3000): 0.0.0.0/0 (temporário)
7. **Storage:** 20-30 GB gp3

### 2. Configurar PostgreSQL

**Opção A: RDS PostgreSQL (Gerenciado)**
```bash
# No Console AWS → RDS
1. Create database
2. PostgreSQL
3. Free tier (se disponível)
4. DB instance: db.t3.micro
5. Database name: workday
6. Username: postgres
7. Password: (senha forte)
8. Public access: Yes (temporariamente)
```

**Opção B: PostgreSQL na própria EC2**
```bash
# Conectar na instância
ssh -i sua-chave.pem ubuntu@ip-da-instancia

# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Configurar PostgreSQL
sudo -u postgres psql
CREATE DATABASE workday;
CREATE USER workday_user WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE workday TO workday_user;
\q

# Configurar acesso externo (se necessário)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Alterar: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Adicionar: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### 3. Instalar Node.js e Dependências

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Verificar instalações
node --version
npm --version
pm2 --version
nginx -v
```

### 4. Fazer Upload da Aplicação

**Opção A: Git Clone**
```bash
# Se tem repositório
git clone https://github.com/seu-usuario/workday.git
cd workday
```

**Opção B: Upload via SCP**
```bash
# No seu computador local
scp -i sua-chave.pem -r dist/ ubuntu@ip-da-instancia:~/workday
```

**Preparar aplicação:**
```bash
cd workday
npm install --production

# Configurar variáveis de ambiente
nano .env
```

**Arquivo .env:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://workday_user:senha_segura@localhost:5432/workday
# ou para RDS:
# DATABASE_URL=postgresql://postgres:senha@endpoint.rds.amazonaws.com:5432/workday
SESSION_SECRET=chave_super_secreta_aleatoria_123456789
```

### 5. Configurar PM2

```bash
# Criar arquivo ecosystem
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'workday',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
}
```

```bash
# Criar pasta de logs
mkdir -p /home/ubuntu/logs

# Executar migrações
npm run db:push

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Verificar status
pm2 status
pm2 logs
```

### 6. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/workday
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

### 7. Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Configurar Firewall

```bash
# UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### 9. Configurar Backup Automático

```bash
# Script de backup PostgreSQL
nano /home/ubuntu/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="workday"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -h localhost -U workday_user -d $DB_NAME > $BACKUP_DIR/workday_$DATE.sql

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "workday_*.sql" -mtime +7 -delete

echo "Backup realizado: workday_$DATE.sql"
```

```bash
# Tornar executável
chmod +x /home/ubuntu/backup.sh

# Configurar cron para backup diário
crontab -e
# Adicionar:
0 2 * * * /home/ubuntu/backup.sh
```

## Monitoramento e Manutenção

### Comandos Úteis
```bash
# Verificar status da aplicação
pm2 status
pm2 logs --lines 50

# Verificar uso de recursos
htop
df -h
free -h

# Verificar PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# Restart serviços
pm2 restart workday
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

### Alertas CloudWatch (Opcional)
1. AWS Console → CloudWatch
2. Create Alarm
3. Métricas: CPU, Memory, Disk
4. Actions: SNS para enviar email

## Vantagens da AWS EC2

### Prós:
- **Controle total** do servidor
- **Custo previsível** (sem surpresas)
- **Performance** dedicada
- **Backup** configurável
- **Scaling** manual ou automático

### Contras:
- **Manutenção** manual necessária
- **Configuração** mais complexa
- **Updates** de segurança manuais
- **Monitoramento** manual

## Custos Detalhados (região us-east-1)

### Configuração Mínima:
- EC2 t3.micro: $8.50/mês
- EBS 20GB: $2.00/mês
- Data transfer: $1.00/mês
- **Total: ~$12/mês**

### Configuração Recomendada:
- EC2 t3.small: $16.80/mês
- RDS db.t3.micro: $12.60/mês
- EBS 30GB: $3.00/mês
- Data transfer: $2.00/mês
- **Total: ~$35/mês**

### Configuração com Load Balancer:
- EC2 t3.small: $16.80/mês
- RDS db.t3.micro: $12.60/mês
- Application Load Balancer: $18/mês
- EBS 30GB: $3.00/mês
- **Total: ~$50/mês**

A instância EC2 oferece excelente custo-benefício com controle total sobre o ambiente.