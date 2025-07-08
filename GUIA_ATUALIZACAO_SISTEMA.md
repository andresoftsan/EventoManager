# Guia de Atualização do Sistema Workday

## Resumo das Atualizações Recentes

### Novas Funcionalidades Implementadas:

1. **Sistema de Conclusão de Tarefas Independente**
   - Tarefas podem ser marcadas como concluídas independentemente do estágio Kanban
   - Tarefas concluídas não aparecem mais no Kanban
   - Indicadores visuais para tarefas concluídas

2. **Sistema de Conclusão de Eventos**
   - Eventos podem ser marcados como "Realizados"
   - Indicadores visuais em todas as visualizações da agenda
   - Estatísticas de eventos realizados no Dashboard

## Passos para Atualização

### 1. Backup dos Dados
```bash
# Fazer backup do banco de dados atual
pg_dump -h SEU_HOST -U SEU_USER -d SEU_DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Atualização do Código
```bash
# Navegar para o diretório do projeto
cd /caminho/para/seu/projeto

# Parar o servidor atual
pm2 stop workday
# ou
sudo systemctl stop workday

# Baixar as atualizações (substitua pela forma que você usa)
git pull origin main
# ou copie os arquivos atualizados
```

### 3. Atualização do Banco de Dados

#### Opção A: PostgreSQL (Recomendado)
```sql
-- Adicionar campo 'completed' na tabela tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Adicionar campo 'completed' na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Atualizar tarefas existentes
UPDATE tasks SET completed = FALSE WHERE completed IS NULL;

-- Atualizar eventos existentes
UPDATE events SET completed = FALSE WHERE completed IS NULL;
```

#### Opção B: MySQL
```sql
-- Adicionar campo 'completed' na tabela tasks
ALTER TABLE tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Adicionar campo 'completed' na tabela events
ALTER TABLE events ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL;

-- Atualizar registros existentes
UPDATE tasks SET completed = FALSE;
UPDATE events SET completed = FALSE;
```

### 4. Configuração do Ambiente

#### Verificar variáveis de ambiente (.env)
```bash
# Verificar se estas variáveis existem
DATABASE_URL=sua_connection_string
EXTERNAL_API_KEY=workday-api-key-2024
SESSION_SECRET=sua_session_secret
```

### 5. Instalação de Dependências
```bash
# Instalar/atualizar dependências
npm install

# Se usar yarn
yarn install
```

### 6. Build da Aplicação
```bash
# Build para produção
npm run build

# Ou usar o script específico para seu ambiente
npm run build-aws
# ou
npm run build-production
```

### 7. Inicialização do Sistema
```bash
# Iniciar o servidor
pm2 start ecosystem.config.js
# ou
npm start
# ou
sudo systemctl start workday
```

### 8. Verificação

#### Testar funcionalidades:
1. **Login**: Verificar se o login funciona normalmente
2. **Tarefas**: 
   - Criar uma tarefa
   - Marcar como concluída
   - Verificar se não aparece no Kanban
3. **Eventos**:
   - Criar um evento
   - Marcar como realizado
   - Verificar indicadores visuais
4. **Dashboard**: Verificar se as estatísticas estão corretas

## Arquivos Modificados

### Schema Database
- `shared/schema.ts` - Adicionado campo `completed` em tasks e events

### Backend
- `server/routes.ts` - Atualizado endpoint PUT para eventos
- `server/storage.ts` - Atualizado métodos de criação

### Frontend
- `client/src/pages/Tarefas.tsx` - Sistema de conclusão de tarefas
- `client/src/pages/Kanban.tsx` - Filtros para tarefas concluídas
- `client/src/pages/Agenda.tsx` - Sistema de conclusão de eventos
- `client/src/pages/Dashboard.tsx` - Estatísticas atualizadas

## Estrutura de Arquivos para Deploy

### Para AWS Elastic Beanstalk
```
.
├── aws-dist/
│   ├── application.js
│   ├── package.json
│   └── public/
├── .ebextensions/
└── .platform/
```

### Para Render/Railway
```
.
├── dist/
│   ├── server.js
│   └── public/
├── package.json
└── Dockerfile (opcional)
```

## Comandos de Build por Plataforma

### AWS
```bash
node build-for-aws.js
```

### Render/Railway
```bash
node build-for-production.js
```

### Apache/Nginx
```bash
npm run build
```

## Troubleshooting

### Problema: Eventos não marcam como realizados
**Solução**: Verificar se o campo `completed` foi adicionado corretamente na tabela events

### Problema: Tarefas concluídas ainda aparecem no Kanban
**Solução**: Limpar cache do navegador e verificar se o campo `completed` existe na tabela tasks

### Problema: Erro 500 ao atualizar eventos
**Solução**: Verificar se o endpoint PUT está usando schema parcial

## Backup e Rollback

### Rollback em caso de problemas
```bash
# Parar aplicação
pm2 stop workday

# Restaurar backup
psql -h SEU_HOST -U SEU_USER -d SEU_DATABASE < backup_TIMESTAMP.sql

# Voltar versão anterior do código
git checkout versao_anterior

# Reiniciar aplicação
pm2 start workday
```

## Suporte

Para problemas específicos, verificar:
1. Logs do servidor: `pm2 logs workday`
2. Logs do banco: Verificar logs específicos do PostgreSQL/MySQL
3. Console do navegador: Verificar erros JavaScript

## Monitoramento Pós-Atualização

- Verificar uso de memória
- Verificar performance das consultas
- Monitorar logs por 24-48 horas
- Testar todas as funcionalidades principais

---

**Data da Atualização**: 08 de Julho de 2025
**Versão**: 2.1.0
**Compatibilidade**: PostgreSQL 12+, MySQL 8+, Node.js 18+