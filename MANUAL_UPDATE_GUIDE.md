# Manual de Atualização - Sistema Workday

## Resumo das Alterações

### Novas Funcionalidades:
1. **Conclusão de Tarefas**: Tarefas podem ser marcadas como concluídas independentemente do Kanban
2. **Conclusão de Eventos**: Eventos podem ser marcados como "Realizados"

### Alterações no Banco de Dados:
- Adicionado campo `completed` na tabela `tasks`
- Adicionado campo `completed` na tabela `events`

## Passo a Passo para Atualização

### 1. BACKUP OBRIGATÓRIO
```bash
# PostgreSQL
pg_dump -h localhost -U postgres -d workday > backup_workday_$(date +%Y%m%d).sql

# MySQL
mysqldump -u root -p workday > backup_workday_$(date +%Y%m%d).sql
```

### 2. PARAR O SISTEMA
```bash
# Se usar PM2
pm2 stop all

# Se usar systemctl
sudo systemctl stop workday

# Se usar Docker
docker-compose down
```

### 3. ATUALIZAR CÓDIGO
```bash
# Baixar arquivos atualizados
# Copiar os arquivos do projeto atualizado para sua pasta

# Principais arquivos modificados:
# - shared/schema.ts
# - server/routes.ts
# - server/storage.ts
# - client/src/pages/Tarefas.tsx
# - client/src/pages/Kanban.tsx
# - client/src/pages/Agenda.tsx
# - client/src/pages/Dashboard.tsx
```

### 4. ATUALIZAR BANCO DE DADOS

#### A. PostgreSQL
```sql
-- Conectar ao banco
psql -h localhost -U postgres -d workday

-- Executar as migrações
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Atualizar registros existentes
UPDATE tasks SET completed = FALSE WHERE completed IS NULL;
UPDATE events SET completed = FALSE WHERE completed IS NULL;

-- Verificar se foi aplicado
\d tasks
\d events
```

#### B. MySQL
```sql
-- Conectar ao banco
mysql -u root -p workday

-- Executar as migrações
ALTER TABLE tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE events ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Atualizar registros existentes
UPDATE tasks SET completed = FALSE;
UPDATE events SET completed = FALSE;

-- Verificar se foi aplicado
DESCRIBE tasks;
DESCRIBE events;
```

### 5. INSTALAR DEPENDÊNCIAS
```bash
npm install
```

### 6. BUILD DA APLICAÇÃO
```bash
# Para produção geral
npm run build

# Para AWS
node build-for-aws.js

# Para outros ambientes
node build-for-production.js
```

### 7. INICIAR O SISTEMA
```bash
# PM2
pm2 start ecosystem.config.js

# systemctl
sudo systemctl start workday

# Docker
docker-compose up -d

# Direto
npm start
```

### 8. VERIFICAR FUNCIONAMENTO

#### Testes Obrigatórios:
1. **Login**: Fazer login no sistema
2. **Tarefas**: 
   - Criar uma tarefa
   - Marcar como concluída
   - Verificar se desaparece do Kanban
3. **Eventos**:
   - Criar um evento
   - Marcar como realizado
   - Verificar indicadores visuais
4. **Dashboard**: Verificar estatísticas

## Comandos de Verificação

### Verificar se campos foram adicionados:
```sql
-- PostgreSQL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'completed';

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'completed';

-- MySQL
SHOW COLUMNS FROM tasks WHERE Field = 'completed';
SHOW COLUMNS FROM events WHERE Field = 'completed';
```

### Verificar dados:
```sql
-- Ver algumas tarefas
SELECT id, title, completed FROM tasks LIMIT 5;

-- Ver alguns eventos
SELECT id, title, completed FROM events LIMIT 5;
```

## Problemas Comuns e Soluções

### 1. Erro "column already exists"
**Causa**: Campo já foi adicionado anteriormente
**Solução**: Ignorar erro ou usar `IF NOT EXISTS` (PostgreSQL)

### 2. Eventos não marcam como realizados
**Causa**: Endpoint PUT não aceita atualizações parciais
**Solução**: Verificar se o código do server/routes.ts foi atualizado

### 3. Tarefas concluídas ainda aparecem no Kanban
**Causa**: Frontend não foi atualizado
**Solução**: Limpar cache do navegador (Ctrl+F5)

### 4. Erro 500 ao atualizar
**Causa**: Schema de validação não aceita campo `completed`
**Solução**: Verificar se o schema foi atualizado

## Rollback (Em caso de problemas)

### 1. Parar sistema
```bash
pm2 stop all
```

### 2. Restaurar backup
```bash
# PostgreSQL
psql -h localhost -U postgres -d workday < backup_workday_YYYYMMDD.sql

# MySQL
mysql -u root -p workday < backup_workday_YYYYMMDD.sql
```

### 3. Restaurar código anterior
```bash
# Voltar versão anterior dos arquivos
```

### 4. Reiniciar sistema
```bash
pm2 start ecosystem.config.js
```

## Logs para Monitoramento

### Verificar logs:
```bash
# PM2
pm2 logs

# systemctl
sudo journalctl -u workday -f

# Docker
docker-compose logs -f
```

### Logs importantes:
- Erros de conexão com banco
- Erros de schema/validação
- Erros 500 em endpoints
- Erros de JavaScript no frontend

## Contato para Suporte

Em caso de problemas durante a atualização:
1. Verificar os logs
2. Conferir se o banco foi atualizado corretamente
3. Verificar se todos os arquivos foram copiados
4. Testar em ambiente de desenvolvimento primeiro

---

**Importante**: Sempre faça backup antes de atualizar!
**Data**: 08 de Julho de 2025
**Versão**: 2.1.0