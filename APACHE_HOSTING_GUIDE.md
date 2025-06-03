# Hospedagem Workday com Apache - Guia Completo

## Como Funciona

Apache atuará como **proxy reverso**, direcionando requisições HTTP/HTTPS para sua aplicação Node.js que roda internamente na porta 3000.

```
Internet → Apache (porta 80/443) → Node.js Workday (porta 3000)
```

## Requisitos do Servidor

### Sistema Operacional:
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Mínimo 1GB RAM, 2GB recomendado
- 20GB de storage

### Software Necessário:
- Apache 2.4+
- Node.js 18+
- PostgreSQL 13+
- PM2 (gerenciador de processos)

## PARTE 1: Instalação Base

### 1. Instalar Apache

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install apache2 -y
sudo systemctl enable apache2
sudo systemctl start apache2
```

**CentOS/RHEL:**
```bash
sudo yum install httpd -y
sudo systemctl enable httpd
sudo systemctl start httpd
```

### 2. Instalar Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 3. Instalar PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Configurar banco
sudo -u postgres psql
CREATE DATABASE workday;
CREATE USER workday_user WITH PASSWORD 'senha_muito_segura';
GRANT ALL PRIVILEGES ON DATABASE workday TO workday_user;
\q
```

### 4. Instalar PM2

```bash
sudo npm install -g pm2
```

## PARTE 2: Configurar Aplicação

### 5. Fazer Upload da Aplicação

**Opção A: Git Clone**
```bash
cd /var/www/
sudo git clone https://github.com/seu-usuario/workday.git
sudo chown -R $USER:$USER /var/www/workday
cd workday
```

**Opção B: Upload Manual**
```bash
# Criar diretório
sudo mkdir -p /var/www/workday
sudo chown -R $USER:$USER /var/www/workday

# Upload via SCP (do seu computador)
scp -r dist/* usuario@servidor:/var/www/workday/
```

### 6. Configurar Ambiente

```bash
cd /var/www/workday
npm install --production

# Criar arquivo de ambiente
nano .env
```

**Arquivo .env:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://workday_user:senha_muito_segura@localhost:5432/workday
SESSION_SECRET=workday_apache_2024_super_secret_key_production_123456789
```

### 7. Configurar PM2

```bash
# Criar configuração PM2
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
    error_file: '/var/log/workday/err.log',
    out_file: '/var/log/workday/out.log',
    log_file: '/var/log/workday/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
}
```

```bash
# Criar pasta de logs
sudo mkdir -p /var/log/workday
sudo chown -R $USER:$USER /var/log/workday

# Executar migrações
npm run db:push

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Verificar se está rodando
pm2 status
curl http://localhost:3000
```

## PARTE 3: Configurar Apache

### 8. Habilitar Módulos Necessários

```bash
# Habilitar módulos do Apache
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests
sudo a2enmod headers
sudo a2enmod rewrite
sudo a2enmod ssl

# Reiniciar Apache
sudo systemctl restart apache2
```

### 9. Criar Virtual Host

```bash
sudo nano /etc/apache2/sites-available/workday.conf
```

**Configuração básica (HTTP):**
```apache
<VirtualHost *:80>
    ServerName seudominio.com
    ServerAlias www.seudominio.com
    DocumentRoot /var/www/workday

    # Proxy para Node.js
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Headers para WebSocket e conexões modernas
    ProxyPassMatch ^/(.*) http://localhost:3000/$1

    # Headers de segurança
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/workday_error.log
    CustomLog ${APACHE_LOG_DIR}/workday_access.log combined
</VirtualHost>
```

### 10. Configurar HTTPS (SSL)

```bash
# Instalar Certbot para Let's Encrypt
sudo apt install certbot python3-certbot-apache -y

# Ativar site
sudo a2ensite workday.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2

# Obter certificado SSL
sudo certbot --apache -d seudominio.com -d www.seudominio.com

# Verificar renovação automática
sudo certbot renew --dry-run
```

**Após SSL, o arquivo será atualizado automaticamente para:**
```apache
<VirtualHost *:443>
    ServerName seudominio.com
    ServerAlias www.seudominio.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/seudominio.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/seudominio.com/privkey.pem
    
    # Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=63072000; includeSubdomains; preload"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Logs
    ErrorLog ${APACHE_LOG_DIR}/workday_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/workday_ssl_access.log combined
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName seudominio.com
    ServerAlias www.seudominio.com
    Redirect permanent / https://seudominio.com/
</VirtualHost>
```

## PARTE 4: Configurar Firewall

### 11. Configurar UFW (Ubuntu Firewall)

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Apache Full'
sudo ufw status
```

**Ou iptables (CentOS):**
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## PARTE 5: Backup e Monitoramento

### 12. Script de Backup

```bash
sudo nano /home/backup-workday.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups"
sudo mkdir -p $BACKUP_DIR

# Backup PostgreSQL
sudo -u postgres pg_dump workday > $BACKUP_DIR/workday_db_$DATE.sql

# Backup arquivos da aplicação
tar -czf $BACKUP_DIR/workday_files_$DATE.tar.gz -C /var/www workday

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "workday_*" -mtime +7 -delete

echo "Backup realizado: $DATE"
```

```bash
sudo chmod +x /home/backup-workday.sh

# Configurar backup diário
sudo crontab -e
# Adicionar linha:
0 2 * * * /home/backup-workday.sh
```

### 13. Monitoramento

**Verificar status dos serviços:**
```bash
# Apache
sudo systemctl status apache2
sudo apache2ctl configtest

# PostgreSQL
sudo systemctl status postgresql

# Aplicação Node.js
pm2 status
pm2 logs workday

# Recursos do servidor
htop
df -h
free -h
```

**Logs importantes:**
```bash
# Logs do Apache
sudo tail -f /var/log/apache2/workday_access.log
sudo tail -f /var/log/apache2/workday_error.log

# Logs da aplicação
pm2 logs workday --lines 50
```

## Comandos de Manutenção

### Restart Serviços
```bash
# Restart aplicação
pm2 restart workday

# Restart Apache
sudo systemctl restart apache2

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Deploy de Atualizações
```bash
cd /var/www/workday

# Backup atual
cp -r . ../workday_backup_$(date +%Y%m%d)

# Atualizar código
git pull  # ou upload manual

# Instalar dependências
npm install --production

# Restart aplicação
pm2 restart workday
```

### Troubleshooting
```bash
# Verificar se aplicação responde
curl http://localhost:3000

# Verificar configuração Apache
sudo apache2ctl configtest

# Verificar conexão banco
psql -h localhost -U workday_user workday

# Verificar logs de erro
sudo tail -f /var/log/apache2/error.log
pm2 logs workday
```

## Vantagens do Apache

**Para Workday:**
- **Estabilidade** comprovada em produção
- **Performance** otimizada para servir arquivos estáticos
- **Flexibilidade** de configuração
- **Módulos** abundantes disponíveis
- **Suporte** da comunidade extenso

**Recursos disponíveis:**
- SSL/TLS automático
- Compressão GZIP
- Cache de arquivos estáticos
- Load balancing (múltiplas instâncias)
- Logs detalhados

## Custos

**VPS com Apache:**
- DigitalOcean: $6-12/mês
- Vultr: $6-12/mês  
- Linode: $5-10/mês
- Contabo: €4-8/mês

**Hosting compartilhado com Apache:**
- Hostinger: $2-5/mês (limitado)
- Locaweb: R$15-30/mês
- Kinghost: R$20-40/mês

Apache é uma excelente opção para hospedar Workday, oferecendo controle total, alta performance e custo acessível.