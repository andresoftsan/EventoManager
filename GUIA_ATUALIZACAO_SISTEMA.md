# Guia de Atualização do Sistema Workday

Este guia explica como atualizar o sistema Workday em ambientes de produção onde já existe uma versão rodando.

## 🔍 Antes de Começar

### 1. Verificar Versão Atual
```bash
# Verificar última atualização nos logs
grep "Changelog" replit.md

# Verificar dependências atuais
cat package.json | grep version
```

### 2. Backup Essencial
```bash
# Backup do banco de dados (PostgreSQL)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dos arquivos de configuração
cp .env .env.backup
cp package.json package.json.backup
```

## 🚀 Métodos de Atualização

### Método 1: Atualização Git (Recomendado)

**Para projetos versionados com Git:**

```bash
# 1. Fazer backup
git stash push -m "backup before update"

# 2. Puxar atualizações
git fetch origin
git pull origin main

# 3. Instalar novas dependências
npm install

# 4. Aplicar migrações do banco (se houver)
npm run db:push

# 5. Reiniciar serviços
npm run dev  # ou pm2 restart workday
```

### Método 2: Download e Substituição

**Para ambientes sem Git:**

```bash
# 1. Parar o serviço
pm2 stop workday  # ou kill do processo

# 2. Backup da versão atual
cp -r /caminho/workday /caminho/workday_backup_$(date +%Y%m%d)

# 3. Baixar nova versão
wget -O workday-nova.zip [URL_DA_NOVA_VERSAO]
unzip workday-nova.zip

# 4. Preservar configurações
cp workday_backup/.env workday-nova/
cp workday_backup/package-lock.json workday-nova/ (se existir)

# 5. Instalar dependências
cd workday-nova
npm install

# 6. Aplicar migrações
npm run db:push

# 7. Iniciar novo serviço
pm2 start ecosystem.config.js
```

### Método 3: Atualização Blue-Green

**Para zero downtime:**

```bash
# 1. Preparar ambiente paralelo
cp -r /app/workday /app/workday-new

# 2. Atualizar novo ambiente
cd /app/workday-new
git pull origin main
npm install
npm run db:push

# 3. Testar novo ambiente na porta alternativa
PORT=5001 npm start &

# 4. Verificar funcionamento
curl http://localhost:5001/api/auth/me

# 5. Trocar proxy/load balancer para nova versão
# 6. Parar versão antiga após confirmação
```

## 🔧 Plataformas Específicas

### Replit
```bash
# 1. Fazer fork do projeto atualizado
# 2. Copiar variáveis de ambiente (Secrets)
# 3. Importar dados se necessário
# 4. Testar funcionamento
# 5. Atualizar DNS/domínio se usar custom domain
```

### AWS Elastic Beanstalk
```bash
# 1. Criar nova versão da aplicação
eb create workday-v2

# 2. Deploy da nova versão
eb deploy workday-v2

# 3. Testar ambiente
eb open workday-v2

# 4. Trocar URLs se funcionando
eb swap workday workday-v2

# 5. Terminar versão antiga
eb terminate workday-old
```

### Heroku
```bash
# 1. Criar novo app
heroku create workday-v2

# 2. Copiar configurações
heroku config --app=workday-old | heroku config:set --app=workday-v2

# 3. Deploy
git push heroku-v2 main

# 4. Migrar banco se necessário
heroku run npm run db:push --app=workday-v2

# 5. Trocar domínio
heroku domains:add seudominio.com --app=workday-v2
```

### VPS/Servidor Próprio
```bash
# 1. Usar PM2 para gerenciamento
pm2 save  # salvar configuração atual

# 2. Clonar nova versão
git clone [REPO] /app/workday-new

# 3. Configurar nova versão
cd /app/workday-new
cp /app/workday/.env .
npm install

# 4. Testar em porta diferente
PORT=5001 pm2 start ecosystem.config.js --name workday-test

# 5. Trocar versões
pm2 stop workday
pm2 start /app/workday-new/ecosystem.config.js --name workday
pm2 delete workday-test
```

## 📋 Checklist de Atualização

### Antes da Atualização
- [ ] Backup do banco de dados
- [ ] Backup dos arquivos de configuração
- [ ] Verificar espaço em disco disponível
- [ ] Notificar usuários sobre manutenção
- [ ] Documentar versão atual

### Durante a Atualização
- [ ] Parar serviços antigos
- [ ] Aplicar nova versão
- [ ] Instalar dependências
- [ ] Executar migrações
- [ ] Verificar configurações
- [ ] Iniciar novos serviços

### Após a Atualização
- [ ] Testar login de usuários
- [ ] Verificar APIs funcionando
- [ ] Testar criação de dados
- [ ] Validar relatórios
- [ ] Monitorar logs de erro
- [ ] Notificar conclusão

## 🔍 Verificação de Integridade

### Testes Automáticos
```bash
# Verificar saúde da API
curl -f http://localhost:5000/api/auth/me || echo "API com problemas"

# Verificar banco de dados
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;" || echo "Banco com problemas"

# Verificar serviços
pm2 status | grep workday || echo "Processo não rodando"
```

### Testes Manuais
1. **Login:** Testar login com usuário admin
2. **Criação:** Criar uma tarefa/cliente/evento
3. **Busca:** Testar funcionalidades de busca
4. **API Externa:** Testar endpoint com chave
5. **Relatórios:** Gerar um relatório de processo

## 🚨 Rollback em Caso de Problemas

### Rollback Rápido
```bash
# Se usando PM2
pm2 stop workday
pm2 start /app/workday-backup/ecosystem.config.js --name workday

# Se usando Git
git reset --hard HEAD~1
npm install
npm restart
```

### Restaurar Banco de Dados
```bash
# Parar aplicação
pm2 stop workday

# Restaurar backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Reiniciar aplicação
pm2 start workday
```

## 📊 Monitoramento Pós-Atualização

### Logs para Monitorar
```bash
# Logs da aplicação
pm2 logs workday --lines 100

# Logs do banco de dados
tail -f /var/log/postgresql/postgresql.log

# Logs do sistema
tail -f /var/log/syslog | grep workday
```

### Métricas Importantes
- Tempo de resposta da API
- Uso de memória e CPU
- Conexões do banco de dados
- Taxa de erro das requisições

## 🔧 Troubleshooting Comum

### Problema: Dependências não compatíveis
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Problema: Migrações falharam
```bash
# Verificar status do banco
npm run db:check
# Aplicar migrações manualmente
npm run db:push --force
```

### Problema: Porta em uso
```bash
# Encontrar processo usando a porta
lsof -i :5000
# Matar processo
kill -9 [PID]
```

### Problema: Variáveis de ambiente perdidas
```bash
# Verificar se .env existe
ls -la .env
# Restaurar do backup
cp .env.backup .env
```

## 📝 Documentação da Atualização

Após cada atualização, documente:
- Data e hora da atualização
- Versão anterior e nova
- Problemas encontrados
- Tempo de downtime
- Testes realizados

Exemplo:
```
Data: 08/07/2025 14:30
Versão: v1.2.1 → v1.3.0
Downtime: 3 minutos
Problemas: Nenhum
Testes: ✓ Login ✓ API ✓ Relatórios
```

## 🔒 Segurança

- Sempre fazer backup antes de atualizar
- Testar em ambiente de desenvolvimento primeiro
- Manter chaves de API atualizadas
- Verificar logs de segurança após atualização
- Atualizar certificados SSL se necessário

---

**⚠️ Importante:** Sempre teste a atualização em um ambiente de desenvolvimento antes de aplicar em produção.