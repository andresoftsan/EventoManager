# Guia Passo a Passo: Deploy Workday na AWS

## PARTE 1: Preparação da Aplicação

### Passo 1: Preparar Build de Produção

Execute no terminal do seu projeto:

```bash
node build-for-aws.js
```

Se der erro, execute manualmente:

```bash
# Build do frontend
npm run build

# Criar pasta dist se não existir
mkdir -p dist

# Copiar arquivos necessários
cp -r server dist/
cp -r shared dist/
cp package.json dist/
cp package-lock.json dist/

# Criar package.json de produção
```

### Passo 2: Criar Arquivo ZIP

1. Abra a pasta `dist/` criada
2. Selecione TODOS os arquivos DENTRO da pasta dist:
   - Pasta `server/`
   - Pasta `shared/` 
   - Arquivo `package.json`
   - Arquivo `package-lock.json`
3. Clique com botão direito → Compactar
4. Nomeie como `workday-app.zip`

⚠️ **IMPORTANTE:** Não compacte a pasta `dist` inteira, apenas o conteúdo dentro dela.

## PARTE 2: Configurar Banco de Dados PostgreSQL

### Passo 3: Acessar Console AWS

1. Vá para [aws.amazon.com](https://aws.amazon.com)
2. Clique "Sign In to the Console"
3. Digite suas credenciais
4. Na barra de pesquisa, digite "RDS" e clique

### Passo 4: Criar Banco PostgreSQL

1. **Na página RDS, clique "Create database"**

2. **Choose a database creation method:**
   - Selecione: "Standard create"

3. **Engine options:**
   - Engine type: **PostgreSQL**
   - Engine version: Deixe a padrão (mais recente)

4. **Templates:**
   - Se tem conta nova: **Free tier**
   - Se não tem free tier: **Dev/Test**

5. **Settings:**
   - DB instance identifier: `workday-database`
   - Master username: `postgres`
   - Master password: Crie uma senha FORTE (anote!)
   - Confirm password: Digite novamente

6. **DB instance class:**
   - Com free tier: `db.t3.micro`
   - Sem free tier: `db.t3.micro` ($12/mês)

7. **Storage:**
   - Storage type: General Purpose SSD (gp2)
   - Allocated storage: 20 GB
   - Storage autoscaling: Deixe marcado

8. **Connectivity:**
   - Compute resource: "Don't connect to an EC2 compute resource"
   - Network type: IPv4
   - Virtual private cloud (VPC): Default VPC
   - DB subnet group: default
   - Public access: **YES** ⚠️
   - VPC security group: "Create new"
   - New VPC security group name: `workday-db-sg`
   - Availability Zone: No preference

9. **Database authentication:**
   - Database authentication options: "Password authentication"

10. **Additional configuration:**
    - Initial database name: `workday`
    - DB parameter group: default
    - Option group: default
    - Backup retention period: 7 days
    - Backup window: No preference
    - Enhanced monitoring: Disable
    - Log exports: Nenhum selecionado

11. **Clique "Create database"**

⏱️ **Aguarde 5-10 minutos** para criação completa.

### Passo 5: Anotar Informações do Banco

Quando status ficar "Available":

1. Clique no nome `workday-database`
2. Na aba "Connectivity & security":
   - **Endpoint:** Copie (algo como `workday-database.xxxxx.us-east-1.rds.amazonaws.com`)
   - **Port:** 5432
3. Você já tem:
   - **Username:** postgres
   - **Password:** A que você criou
   - **Database:** workday

**String de conexão completa:**
```
postgresql://postgres:SUA_SENHA@workday-database.xxxxx.us-east-1.rds.amazonaws.com:5432/workday
```

## PARTE 3: Deploy no Elastic Beanstalk

### Passo 6: Acessar Elastic Beanstalk

1. Na barra de pesquisa AWS, digite "Elastic Beanstalk"
2. Clique no serviço

### Passo 7: Criar Aplicação

1. **Clique "Create application"**

2. **Application information:**
   - Application name: `workday-app`
   - Application tags: Deixe vazio

3. **Platform:**
   - Platform: **Node.js**
   - Platform branch: "Node.js 18 running on 64bit Amazon Linux 2"
   - Platform version: (deixe a recomendada)

4. **Application code:**
   - Source code origin: "Upload your code"
   - Version label: Deixe automático
   - Clique "Choose file" → Selecione `workday-app.zip`

5. **Presets (IMPORTANTE para custos):**
   - Configuration presets: **Single instance (free tier eligible)**

6. **Clique "Create application"**

⏱️ **Aguarde 5-15 minutos** para deploy completo. Você verá logs em tempo real.

### Passo 8: Configurar Variáveis de Ambiente

Depois que o status ficar "Ok" (verde):

1. **No painel da aplicação, clique "Configuration" (menu esquerdo)**

2. **Na seção "Software", clique "Edit"**

3. **Role até "Environment properties"**

4. **Adicione as seguintes variáveis:**

   **Variável 1:**
   - Name: `NODE_ENV`
   - Value: `production`

   **Variável 2:**
   - Name: `DATABASE_URL`
   - Value: `postgresql://postgres:SUA_SENHA@SEU_ENDPOINT:5432/workday`
   - (substitua pela string real do seu banco)

   **Variável 3:**
   - Name: `SESSION_SECRET`
   - Value: `workday_2024_super_secret_key_production_123456789`

5. **Clique "Apply" no final da página**

⏱️ **Aguarde 2-5 minutos** para aplicação das mudanças.

## PARTE 4: Configurar Segurança

### Passo 9: Configurar Security Groups

1. **Digite "EC2" na barra de pesquisa AWS**
2. **No menu esquerdo, clique "Security Groups"**

3. **Encontrar Security Group do Elastic Beanstalk:**
   - Procure por nome contendo "awseb"
   - Exemplo: `awseb-e-xxxxx-stack-AWSEBSecurityGroup`
   - **Anote o ID deste grupo** (sg-1234567890abcdef0)

4. **Encontrar Security Group do RDS:**
   - Procure por `workday-db-sg`
   - Clique nele

5. **Configurar acesso seguro:**
   - Na aba "Inbound rules", clique "Edit inbound rules"
   - Clique "Delete" na regra existente (remove acesso público)
   - Clique "Add rule":
     - Type: PostgreSQL
     - Protocol: TCP
     - Port range: 5432
     - Source: Custom
     - Source field: Cole o ID do Security Group do Elastic Beanstalk
   - Clique "Save rules"

### Passo 10: Testar a Aplicação

1. **Volte ao Elastic Beanstalk**
2. **No painel principal, encontre a URL da aplicação**
   - Algo como: `workday-app.us-east-1.elasticbeanstalk.com`
3. **Clique na URL**
4. **Teste login:**
   - Usuário: `admin`
   - Senha: `master123`

✅ **Se funcionou, parabéns! Sua aplicação está na nuvem!**

## PARTE 5: Configurações Opcionais

### Passo 11: Domínio Personalizado (Opcional)

1. **Compre um domínio** (Registro.br, GoDaddy, etc.)
2. **No Route 53 (AWS):**
   - Create hosted zone
   - Domain name: seudominio.com.br
   - Create record → Alias to Elastic Beanstalk environment
3. **Configure DNS** no seu provedor de domínio

### Passo 12: SSL/HTTPS (Opcional)

1. **AWS Certificate Manager**
2. **Request certificate**
3. **Domain name:** seudominio.com.br
4. **Validation:** DNS validation
5. **Em Elastic Beanstalk:**
   - Configuration → Load balancer
   - Add HTTPS listener
   - SSL certificate: Selecione o criado

## Troubleshooting

### Se a aplicação não funcionar:

**1. Verificar logs:**
- Elastic Beanstalk → Logs → Request Logs → Last 100 Lines

**2. Problemas comuns:**

**Erro: "Cannot connect to database"**
- Verificar se DATABASE_URL está correta
- Verificar se RDS está "Available"
- Verificar Security Groups

**Erro: "502 Bad Gateway"**
- Aplicação não está iniciando
- Verificar se `npm start` funciona localmente
- Verificar logs para erros específicos

**Erro: "Environment variables not found"**
- Reconfigurar as variáveis de ambiente
- Aplicar mudanças e aguardar restart

### Comandos úteis:

**Testar conexão local com RDS:**
```bash
psql -h SEU_ENDPOINT -U postgres -d workday
```

**Ver logs da aplicação:**
- No console Elastic Beanstalk → Logs

## Custos Mensais Estimados

### Com Free Tier (12 meses):
- EC2 t3.micro: $0 (750h grátis)
- RDS db.t3.micro: $0 (750h grátis)
- Load Balancer: $18 (se usar)
- **Total: $0-18/mês**

### Após Free Tier:
- EC2 t3.micro: $8.50/mês
- RDS db.t3.micro: $12.60/mês
- Storage: $2-5/mês
- **Total: $23-26/mês**

## Próximos Passos

Após deploy bem-sucedido:

1. ✅ **Teste todas as funcionalidades**
2. ✅ **Configure backup automático** (RDS já faz)
3. ✅ **Configure monitoramento** (CloudWatch)
4. ✅ **Configure domínio próprio**
5. ✅ **Configure alertas de custo**

Sua aplicação Workday está agora rodando profissionalmente na AWS com alta disponibilidade, backup automático e escalabilidade.