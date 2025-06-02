# Guia Completo: Deploy do Workday na AWS

## Pré-requisitos
- Conta AWS (com cartão de crédito cadastrado)
- Aplicação Workday funcionando localmente

## PARTE 1: Preparar a Aplicação

### 1.1 Gerar Build de Produção
```bash
# Execute este comando na raiz do projeto
node build-for-aws.js
```

### 1.2 Criar arquivo ZIP
- Acesse a pasta `dist/` que foi criada
- Selecione TODOS os arquivos dentro de `dist/`
- Compacte em um arquivo ZIP (ex: `workday-app.zip`)
- **IMPORTANTE:** Não compacte a pasta `dist`, mas sim o conteúdo dentro dela

## PARTE 2: Configurar Banco de Dados (Amazon RDS)

### 2.1 Criar instância RDS PostgreSQL
1. Acesse AWS Console → RDS
2. Clique em "Create database"
3. Escolha:
   - Engine: PostgreSQL
   - Template: Free tier (se elegível)
   - DB instance class: db.t3.micro
   - Storage: 20 GB (suficiente para começar)
4. Configurações de credenciais:
   - Master username: `postgres`
   - Master password: (crie uma senha forte)
5. Conectividade:
   - Public access: Yes (temporariamente)
   - VPC security group: Create new
6. Clique "Create database"

### 2.2 Anotar informações da conexão
Após criação, anote:
- Endpoint (ex: `workday-db.xxxxx.us-east-1.rds.amazonaws.com`)
- Port: `5432`
- Username: `postgres`
- Password: (a que você criou)

## PARTE 3: Deploy no Elastic Beanstalk

### 3.1 Criar aplicação
1. Acesse AWS Console → Elastic Beanstalk
2. Clique "Create application"
3. Configurações:
   - Application name: `workday-app`
   - Platform: Node.js
   - Platform version: (última disponível)
   - Application code: Upload your code
   - Upload: o arquivo ZIP criado no passo 1.2

### 3.2 Configurar variáveis de ambiente
1. Após deploy inicial, acesse Configuration
2. Software → Edit
3. Environment properties, adicione:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:SUA_SENHA@SEU_ENDPOINT:5432/postgres
SESSION_SECRET=uma_chave_super_secreta_e_aleatoria_aqui
```

4. Apply changes

## PARTE 4: Configurar Segurança

### 4.1 Configurar Security Groups
1. AWS Console → EC2 → Security Groups
2. Encontre o security group do RDS
3. Edit inbound rules
4. Add rule:
   - Type: PostgreSQL
   - Source: Security group do Elastic Beanstalk

### 4.2 Testar conexão
- Aguarde deploy finalizar (5-10 minutos)
- Acesse a URL fornecida pelo Elastic Beanstalk
- Teste login com: admin / master123

## PARTE 5: Configurações Opcionais

### 5.1 Domínio personalizado
1. Route 53 → Hosted zones
2. Create record → Alias to Elastic Beanstalk environment

### 5.2 SSL Certificate
1. Certificate Manager → Request certificate
2. Add domain name
3. Validate via DNS/Email
4. Configure in Load Balancer

### 5.3 Monitoramento
- CloudWatch Logs estão automaticamente configurados
- Elastic Beanstalk Health Dashboard mostra status

## CUSTOS ESTIMADOS (Mensais)

### Configuração Mínima:
- EC2 t3.micro: $8-12 (free tier por 12 meses)
- RDS db.t3.micro: $12-15
- Data transfer: $1-3
- **Total: $15-25/mês**

### Configuração Recomendada:
- EC2 t3.small: $15-20
- RDS db.t3.small: $25-30
- Load Balancer: $18
- **Total: $55-70/mês**

## TROUBLESHOOTING

### Problema: Aplicação não inicia
- Verifique logs no Elastic Beanstalk console
- Confirme se DATABASE_URL está correto
- Teste conexão do banco localmente

### Problema: Erro de conexão com banco
- Verifique security groups
- Confirme que RDS está em "Available"
- Teste endpoint com ferramenta externa

### Problema: 502 Bad Gateway
- Aplicação pode estar falhando ao iniciar
- Verifique se porta está correta (aplicação usa porta que AWS define automaticamente)

## COMANDOS ÚTEIS

### Testar conexão local com RDS:
```bash
psql -h SEU_ENDPOINT -U postgres -d postgres
```

### Ver logs em tempo real:
```bash
eb logs --all
```

### Deploy de atualização:
1. Rode novamente: `node build-for-aws.js`
2. Crie novo ZIP
3. Upload no Elastic Beanstalk

## PRÓXIMOS PASSOS

Após deploy bem-sucedido:
1. Teste todas as funcionalidades
2. Configure backup automático do RDS
3. Configure alertas de monitoramento
4. Considere usar CloudFront para melhor performance
5. Configure pipeline CI/CD para deploys automáticos

## SUPORTE
- AWS Support (se tiver plano)
- Documentação Elastic Beanstalk
- Documentação RDS PostgreSQL