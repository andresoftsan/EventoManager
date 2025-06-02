# Guia de Configuração MySQL para Workday

## Como Migrar de PostgreSQL para MySQL

### Opção 1: Usar MySQL no Servidor Linux

#### 1. Instalar MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server mysql-client
sudo mysql_secure_installation
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server mysql
sudo systemctl start mysqld
sudo systemctl enable mysqld
sudo mysql_secure_installation
```

#### 2. Configurar Banco de Dados
```bash
sudo mysql -u root -p

CREATE DATABASE workday;
CREATE USER 'workday_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON workday.* TO 'workday_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3. Modificar Arquivos da Aplicação

**a) Substituir schema atual:**
```bash
# Fazer backup do schema atual
cp shared/schema.ts shared/schema-postgres-backup.ts

# Substituir pelo schema MySQL
cp shared/schema-mysql.ts shared/schema.ts
```

**b) Substituir conexão do banco:**
```bash
# Fazer backup da conexão atual
cp server/db.ts server/db-postgres-backup.ts

# Substituir pela conexão MySQL
cp server/db-mysql.ts server/db.ts
```

**c) Atualizar configuração do Drizzle:**
```bash
# Fazer backup da configuração atual
cp drizzle.config.ts drizzle-postgres-backup.config.ts

# Substituir pela configuração MySQL
cp drizzle-mysql.config.ts drizzle.config.ts
```

#### 4. Configurar Variáveis de Ambiente

**Arquivo .env:**
```env
DATABASE_URL=mysql://workday_user:sua_senha_segura@localhost:3306/workday
NODE_ENV=production
SESSION_SECRET=uma_chave_muito_secreta_aleatoria
```

#### 5. Executar Migrações
```bash
npm run db:push
```

### Opção 2: Usar MySQL na AWS (Amazon RDS)

#### 1. Criar Instância MySQL no RDS

**No Console AWS → RDS:**
1. Create database
2. **Engine:** MySQL
3. **Version:** 8.0 (recomendado)
4. **Template:** Free tier (se disponível)
5. **DB instance identifier:** workday-mysql-db
6. **Master username:** admin
7. **Master password:** (crie uma senha forte)
8. **DB instance class:** db.t3.micro
9. **Storage:** 20 GB
10. **Public access:** Yes (temporariamente)
11. Create database

#### 2. Configurar String de Conexão

**Formato da DATABASE_URL para AWS:**
```
mysql://admin:SUA_SENHA@workday-mysql-db.xxxxx.region.rds.amazonaws.com:3306/workday
```

#### 3. Seguir Mesmos Passos de Modificação

Use os mesmos arquivos criados acima:
- `shared/schema-mysql.ts`
- `server/db-mysql.ts` 
- `drizzle-mysql.config.ts`

### Opção 3: Usar Serviços MySQL em Nuvem

#### PlanetScale (Recomendado para Desenvolvimento)
```env
DATABASE_URL=mysql://username:password@host.planetscale.dev:3306/database?ssl={"rejectUnauthorized":true}
```

#### DigitalOcean Managed MySQL
```env
DATABASE_URL=mysql://username:password@host-do-user-123456-0.db.ondigitalocean.com:25060/database?ssl=true
```

## Comparação PostgreSQL vs MySQL

### Vantagens do MySQL:
- **Popularidade:** Mais amplamente usado
- **Hosting:** Mais opções de hospedagem barata
- **Compatibilidade:** Suporte quase universal
- **Performance:** Excelente para reads simples

### Vantagens do PostgreSQL:
- **Recursos avançados:** JSON, arrays, tipos customizados
- **Conformidade SQL:** Mais rigoroso com padrões
- **Extensibilidade:** Plugins e extensões
- **Performance complexa:** Melhor para queries complexas

## Custos Comparativos

### Servidor Próprio:
- **MySQL:** Gratuito (open source)
- **PostgreSQL:** Gratuito (open source)

### AWS RDS:
- **MySQL:** Mesmos preços do PostgreSQL
- **Aurora MySQL:** 20% mais caro mas melhor performance

### Hospedagem Compartilhada:
- **MySQL:** $2-10/mês (cPanel, DirectAdmin)
- **PostgreSQL:** $5-20/mês (menos comum)

## Comandos de Migração

### Se já tem dados no PostgreSQL:

#### 1. Exportar dados do PostgreSQL:
```bash
pg_dump -h localhost -U postgres workday --data-only --inserts > dados_postgres.sql
```

#### 2. Converter para MySQL:
```bash
# Substituir sintaxe específica do PostgreSQL
sed -i 's/TRUE/1/g' dados_postgres.sql
sed -i 's/FALSE/0/g' dados_postgres.sql
sed -i "s/nextval('.*')//g" dados_postgres.sql
```

#### 3. Importar no MySQL:
```bash
mysql -u workday_user -p workday < dados_postgres_convertido.sql
```

## Arquivo de Build para AWS com MySQL

```javascript
// build-for-aws-mysql.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Preparando aplicação MySQL para deploy na AWS...');

// 1. Substituir arquivos para MySQL
const replacements = [
  ['shared/schema-mysql.ts', 'shared/schema.ts'],
  ['server/db-mysql.ts', 'server/db.ts'],
  ['drizzle-mysql.config.ts', 'drizzle.config.ts']
];

replacements.forEach(([source, dest]) => {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`✅ ${dest} atualizado para MySQL`);
  }
});

// 2. Build normal
execSync('npm run build', { stdio: 'inherit' });

// Resto igual ao build normal...
```

## Monitoramento MySQL

### Verificar status:
```bash
sudo systemctl status mysql
mysql -u workday_user -p -e "SHOW PROCESSLIST;"
```

### Logs:
```bash
sudo tail -f /var/log/mysql/error.log
```

### Performance:
```bash
mysql -u workday_user -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

A migração para MySQL é totalmente viável e pode oferecer vantagens dependendo da sua infraestrutura e necessidades específicas.