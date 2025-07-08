# Guia de Atualização Manual do Sistema Workday (Sem Git)

## 📋 Pré-requisitos

Você precisará:
- Acesso ao servidor onde está rodando
- Backup do banco de dados
- Códigos fonte da nova versão
- Acesso SSH/terminal ao servidor

## 🔧 Passo a Passo Detalhado

### 1. Preparação e Backup

```bash
# Entrar no diretório do sistema atual
cd /caminho/para/workday

# Parar o sistema atual
# Se usando PM2:
pm2 stop workday

# Se usando systemd:
sudo systemctl stop workday

# Se executando manualmente:
# Pressione Ctrl+C ou kill -15 [PID]

# Fazer backup completo
cp -r /caminho/para/workday /caminho/para/workday_backup_$(date +%Y%m%d_%H%M%S)

# Backup do banco de dados PostgreSQL
pg_dump $DATABASE_URL > /caminho/para/backup_db_$(date +%Y%m%d_%H%M%S).sql

# Backup das configurações importantes
cp .env .env.backup
cp package.json package.json.backup
```

### 2. Obter Nova Versão

#### Opção A: Download direto (se disponível)
```bash
# Baixar nova versão
wget -O workday-nova.zip [URL_DA_NOVA_VERSAO]
unzip workday-nova.zip
```

#### Opção B: Copiar arquivos manualmente
```bash
# Criar diretório temporário
mkdir /tmp/workday-nova
# Copiar arquivos novos para /tmp/workday-nova/
```

### 3. Preparar Nova Versão

```bash
# Ir para diretório da nova versão
cd /tmp/workday-nova

# Restaurar configurações da versão anterior
cp /caminho/para/workday/.env .
cp /caminho/para/workday/.env.backup .

# Se existir package-lock.json da versão anterior, copiar também
if [ -f "/caminho/para/workday/package-lock.json" ]; then
    cp /caminho/para/workday/package-lock.json .
fi

# Instalar dependências
npm install

# Verificar se instalou corretamente
npm audit
```

### 4. Aplicar Migrações e Configurações

```bash
# Verificar conexão com banco
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('DB OK')).catch(console.error);
"

# Aplicar migrações do banco (se necessário)
npm run db:push

# Verificar se as tabelas foram criadas/atualizadas
psql $DATABASE_URL -c "\dt"
```

### 5. Testar Nova Versão

```bash
# Testar em porta diferente primeiro
PORT=5001 npm start &

# Aguardar alguns segundos
sleep 5

# Testar endpoints básicos
curl -f http://localhost:5001/api/auth/me || echo "❌ API não está respondendo"

# Testar login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"master123"}' || echo "❌ Login falhou"

# Se tudo OK, parar teste
kill $(ps aux | grep 'PORT=5001' | grep -v grep | awk '{print $2}')
```

### 6. Substituir Versão Atual

```bash
# Parar versão atual (se ainda estiver rodando)
pm2 stop workday

# Fazer backup final da versão atual
mv /caminho/para/workday /caminho/para/workday_old_$(date +%Y%m%d_%H%M%S)

# Mover nova versão para lugar da atual
mv /tmp/workday-nova /caminho/para/workday

# Ir para diretório da nova versão
cd /caminho/para/workday
```

### 7. Iniciar Nova Versão

```bash
# Se usando PM2:
pm2 start ecosystem.config.js --name workday

# Se usando systemd:
sudo systemctl start workday
sudo systemctl enable workday

# Se executando manualmente:
nohup npm start > workday.log 2>&1 &
```

### 8. Verificar se Funcionou

```bash
# Aguardar alguns segundos
sleep 10

# Verificar se processo está rodando
pm2 status workday
# ou
ps aux | grep workday

# Testar API
curl -f http://localhost:5000/api/auth/me

# Verificar logs
pm2 logs workday --lines 20
# ou
tail -f workday.log
```

## 🔄 Arquivos que Precisa Copiar da Versão Anterior

### Essenciais:
- `.env` (configurações)
- `package-lock.json` (versões das dependências)

### Opcionais:
- `uploads/` (se tiver arquivos enviados pelos usuários)
- `logs/` (logs antigos)
- Certificados SSL customizados

## 🚨 Rollback em Caso de Problema

Se algo der errado:

```bash
# Parar nova versão
pm2 stop workday

# Restaurar versão anterior
mv /caminho/para/workday /caminho/para/workday_failed
mv /caminho/para/workday_old_YYYYMMDD_HHMMSS /caminho/para/workday

# Restaurar banco se necessário
psql $DATABASE_URL < /caminho/para/backup_db_YYYYMMDD_HHMMSS.sql

# Reiniciar versão antiga
cd /caminho/para/workday
pm2 start ecosystem.config.js --name workday

# Verificar se voltou ao normal
curl -f http://localhost:5000/api/auth/me
```

## 📝 Checklist de Verificação Pós-Atualização

### Funcionalidades Básicas:
- [ ] Login com admin/master123
- [ ] Dashboard carregando
- [ ] Criar uma tarefa
- [ ] Criar um cliente
- [ ] Acessar módulo de processos
- [ ] Testar API externa (se usada)

### Verificações Técnicas:
- [ ] Processo rodando (pm2 status)
- [ ] Sem erros nos logs
- [ ] Banco de dados conectado
- [ ] Todas as tabelas existem
- [ ] Arquivos estáticos carregando

### Comandos de Verificação:
```bash
# Status do processo
pm2 status

# Logs recentes
pm2 logs workday --lines 50

# Verificar tabelas do banco
psql $DATABASE_URL -c "\dt"

# Verificar espaço em disco
df -h

# Verificar memória
free -h

# Testar conectividade
curl -I http://localhost:5000
```

## 🔍 Troubleshooting Comum

### Problema: "Module not found"
```bash
cd /caminho/para/workday
rm -rf node_modules package-lock.json
npm install
```

### Problema: "Port already in use"
```bash
# Encontrar processo usando a porta
lsof -i :5000
# Matar processo
kill -9 [PID]
```

### Problema: "Database connection failed"
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql
# Verificar variável de ambiente
echo $DATABASE_URL
```

### Problema: "Permission denied"
```bash
# Ajustar permissões
sudo chown -R $USER:$USER /caminho/para/workday
chmod -R 755 /caminho/para/workday
```

## 📊 Estrutura de Arquivos Importante

```
workday/
├── server/           # Código do backend
├── client/           # Código do frontend
├── shared/           # Schemas compartilhados
├── .env             # Configurações (MANTER)
├── package.json     # Dependências
├── package-lock.json # Versões fixas (MANTER)
├── README.md        # Documentação
└── *.md             # Guias e documentação
```

## 🕐 Tempo Estimado

- Backup: 5-10 minutos
- Download/preparação: 10-15 minutos
- Instalação: 5-10 minutos
- Testes: 5-10 minutos
- **Total: 25-45 minutos**

## 💡 Dicas Importantes

1. **Sempre teste em horário de menor movimento**
2. **Avise os usuários sobre a manutenção**
3. **Tenha o backup testado e funcional**
4. **Documente qualquer problema encontrado**
5. **Mantenha backups antigos por pelo menos 7 dias**

---

**⚠️ Lembre-se:** Este processo causa downtime. Planeje adequadamente e sempre teste em ambiente de desenvolvimento primeiro!