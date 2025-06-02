# Guia Detalhado: Deploy do Workday na AWS com Elastic Beanstalk

## O que vamos fazer?
Vamos migrar sua aplicação Workday (que roda localmente) para a nuvem AWS, onde ela ficará disponível 24/7 na internet. O processo envolve:
1. **Preparar** a aplicação para produção
2. **Criar** um banco de dados na nuvem
3. **Subir** a aplicação nos servidores da AWS
4. **Conectar** tudo e configurar segurança

## Pré-requisitos
- Conta AWS (será necessário cartão de crédito, mas há opções gratuitas)
- Aplicação Workday funcionando localmente
- Acesso ao terminal/prompt de comando

## PARTE 1: Preparar a Aplicação

### Por que precisamos preparar a aplicação?
Sua aplicação atualmente roda em modo desenvolvimento. Para funcionar na AWS, precisamos:
- Compilar o código React para arquivos estáticos otimizados
- Configurar o servidor para produção
- Criar estrutura de arquivos que a AWS entende

### 1.1 Gerar Build de Produção

**O que este comando faz:**
- Compila seu frontend React em arquivos HTML/CSS/JS otimizados
- Prepara o servidor Node.js para rodar em produção
- Cria configurações específicas para AWS Elastic Beanstalk
- Organiza tudo na pasta `dist/`

```bash
# Abra terminal na pasta raiz do seu projeto Workday
node build-for-aws.js
```

**Você verá algo como:**
```
🔨 Preparando aplicação para deploy na AWS...
📦 Fazendo build do frontend...
📁 Copiando arquivos do servidor...
✅ Copiado: server
✅ Copiado: shared
✅ package.json de produção criado
✅ Configuração do Elastic Beanstalk criada
🎉 Aplicação preparada para deploy!
```

### 1.2 Criar arquivo ZIP para upload

**Por que ZIP?**
AWS Elastic Beanstalk precisa receber todos os arquivos em um único pacote compactado.

**Passos detalhados:**
1. Abra a pasta `dist/` que foi criada no seu projeto
2. **IMPORTANTE:** Entre DENTRO da pasta `dist/`
3. Selecione TODOS os arquivos e pastas que estão dentro de `dist/`:
   - Pasta `server/`
   - Pasta `shared/`
   - Pasta `.ebextensions/`
   - Arquivo `package.json`
   - Arquivo `package-lock.json`
4. Clique com botão direito → "Compactar" ou "Send to ZIP"
5. Nomeie como `workday-app.zip`

**ERRO COMUM:** Não compacte a pasta `dist` inteira, mas sim apenas o conteúdo dentro dela. A AWS precisa ver os arquivos diretamente na raiz do ZIP.

## PARTE 2: Configurar Banco de Dados (Amazon RDS)

### Por que precisamos de um banco na nuvem?
Atualmente sua aplicação usa PostgreSQL local. Na AWS, precisamos de um banco de dados que:
- Fique sempre disponível (mesmo se o servidor da aplicação reiniciar)
- Tenha backup automático
- Seja gerenciado pela AWS (sem manutenção manual)

### 2.1 Criar instância RDS PostgreSQL

**Passo a passo detalhado:**

1. **Acesse o Console AWS**
   - Vá para [aws.amazon.com](https://aws.amazon.com)
   - Faça login na sua conta
   - No topo, procure por "RDS" e clique

2. **Iniciar criação do banco**
   - Na página do RDS, clique no botão laranja "Create database"

3. **Escolher tipo de banco**
   - **Database creation method:** Standard create
   - **Engine type:** PostgreSQL
   - **Engine version:** Deixe a versão padrão (mais recente)

4. **Templates (muito importante para custo)**
   - Se você tem conta nova: **Free tier** (economia máxima)
   - Se não tem free tier disponível: **Dev/Test** (mais barato que Production)

5. **Configurações da instância**
   - **DB instance identifier:** `workday-database` (nome para identificar)
   - **Master username:** `postgres` (padrão)
   - **Master password:** Crie uma senha forte (anote ela!)
   - **Confirm password:** Digite novamente

6. **Instance configuration**
   - **DB instance class:** 
     - Com free tier: `db.t3.micro` (gratuito)
     - Sem free tier: `db.t3.micro` (mais barato - $12/mês)

7. **Storage**
   - **Storage type:** General Purpose SSD (gp2)
   - **Allocated storage:** 20 GB (suficiente para começar)
   - **Storage autoscaling:** Deixe habilitado

8. **Connectivity (CRUCIAL)**
   - **Compute resource:** Don't connect to an EC2 compute resource
   - **VPC:** Default VPC
   - **Subnet group:** default
   - **Public access:** **YES** (importante para configuração inicial)
   - **VPC security group:** Create new
   - **Security group name:** `workday-db-sg`

9. **Database authentication**
   - **Database authentication:** Password authentication

10. **Additional configuration**
    - **Initial database name:** `workday` (nome do banco que será criado)
    - **Backup:** Deixe habilitado (7 dias de retenção)
    - **Monitoring:** Deixe habilitado

11. **Finalizar**
    - Revise todos os dados
    - Clique "Create database"
    - **Aguarde 5-10 minutos** para criação completa

### 2.2 Anotar informações da conexão

**Após a criação estar completa:**

1. Na lista de bancos, clique no seu banco `workday-database`
2. Na aba "Connectivity & security", anote:
   - **Endpoint:** (algo como `workday-database.xxxxx.us-east-1.rds.amazonaws.com`)
   - **Port:** `5432`
3. Você já tem:
   - **Username:** `postgres`
   - **Password:** A senha que você criou
   - **Database name:** `workday`

**Exemplo de como ficará sua string de conexão:**
```
postgresql://postgres:SUA_SENHA@workday-database.xxxxx.us-east-1.rds.amazonaws.com:5432/workday
```

## PARTE 3: Deploy no Elastic Beanstalk

### O que é Elastic Beanstalk?
É um serviço da AWS que facilita o deploy de aplicações web. Ele automaticamente:
- Cria servidores para rodar sua aplicação
- Configura load balancer (distribuidor de carga)
- Monitora a saúde da aplicação
- Gerencia atualizações e escalabilidade

### 3.1 Criar aplicação no Elastic Beanstalk

**Passo a passo detalhado:**

1. **Acesse Elastic Beanstalk**
   - No console AWS, procure por "Elastic Beanstalk"
   - Clique no serviço

2. **Iniciar criação da aplicação**
   - Clique no botão "Create application"

3. **Configurar informações básicas**
   - **Application name:** `workday-app`
   - **Application tags:** (opcional, deixe vazio)

4. **Configurar plataforma**
   - **Platform:** Node.js
   - **Platform branch:** Node.js 18 running on 64bit Amazon Linux 2
   - **Platform version:** (deixe a recomendada - mais recente)

5. **Configurar código da aplicação**
   - **Application code:** Upload your code
   - **Source code origin:** Local file
   - **Choose file:** Selecione o arquivo `workday-app.zip` que você criou
   - Aguarde o upload terminar

6. **Configurar presets (importante para custos)**
   - **Presets:** Single instance (free tier eligible)
   - Isso criará apenas 1 servidor, mais barato

7. **Revisar e criar**
   - Clique "Create application"
   - **Aguarde 5-15 minutos** para deploy completo
   - Você verá uma tela com logs em tempo real

### 3.2 Configurar variáveis de ambiente

**Por que precisamos disso?**
Sua aplicação precisa saber como conectar no banco de dados da AWS e outras configurações de produção.

**Passo a passo:**

1. **Aguarde deploy inicial finalizar**
   - O status deve mostrar "Ok" (verde)
   - Se der erro, veja logs na seção "Recent events"

2. **Acessar configurações**
   - No painel da sua aplicação, clique em "Configuration" (lado esquerdo)

3. **Editar configurações de software**
   - Na seção "Software", clique "Edit"

4. **Adicionar variáveis de ambiente**
   - Role para baixo até "Environment properties"
   - Clique "Add environment property" para cada variável:

   **Variável 1:**
   - **Name:** `NODE_ENV`
   - **Value:** `production`

   **Variável 2:**
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql://postgres:SUA_SENHA@SEU_ENDPOINT:5432/workday`
   - (substitua pela string real do seu banco)

   **Variável 3:**
   - **Name:** `SESSION_SECRET`
   - **Value:** `uma_chave_muito_secreta_e_aleatoria_que_so_voce_sabe_123456789`

5. **Aplicar mudanças**
   - Clique "Apply" (no final da página)
   - Aguarde 2-5 minutos para aplicação das mudanças
   - A aplicação será reiniciada automaticamente

## PARTE 4: Configurar Segurança

### Por que configurar segurança?
Atualmente, seu banco de dados está acessível publicamente. Precisamos restringir o acesso apenas para sua aplicação, criando uma "ponte segura" entre elas.

### 4.1 Configurar Security Groups (Firewall da AWS)

**O que são Security Groups?**
São firewalls virtuais que controlam quem pode acessar seus recursos. Vamos configurar para que apenas sua aplicação possa acessar o banco.

**Passo a passo:**

1. **Encontrar os Security Groups**
   - AWS Console → digite "EC2" e clique
   - No menu esquerdo, clique "Security Groups"

2. **Identificar Security Group do Elastic Beanstalk**
   - Procure por um grupo com nome contendo "awseb" (ex: `awseb-e-xxxxx-stack-AWSEBSecurityGroup`)
   - **Anote o ID deste grupo** (ex: `sg-1234567890abcdef0`)

3. **Encontrar Security Group do RDS**
   - Procure por um grupo com nome `workday-db-sg` ou similar
   - Clique nele para abrir

4. **Configurar acesso seguro**
   - Na aba "Inbound rules", clique "Edit inbound rules"
   - **Remover a regra atual** (que permite acesso público)
   - Clique "Add rule" e configure:
     - **Type:** PostgreSQL
     - **Protocol:** TCP
     - **Port range:** 5432
     - **Source:** Custom
     - **Source field:** Cole o ID do Security Group do Elastic Beanstalk
   - Clique "Save rules"

5. **Verificar resultado**
   - Agora apenas sua aplicação pode acessar o banco
   - Isso melhora drasticamente a segurança

### 4.2 Primeiro teste da aplicação

**Aguardar processo completo:**
- Aguarde todas as configurações serem aplicadas (5-10 minutos total)
- No Elastic Beanstalk, o status deve estar "Ok" (verde)

**Acessar aplicação:**
1. No painel do Elastic Beanstalk, encontre a URL da aplicação
   - Algo como: `workday-app.us-east-1.elasticbeanstalk.com`
2. Clique na URL ou cole no navegador
3. Você deve ver a tela de login do Workday

**Teste de login:**
- **Usuário:** admin
- **Senha:** master123
- Se funcionar, parabéns! Sua aplicação está na nuvem

**Se der erro:**
- Verifique logs no Elastic Beanstalk (seção "Logs")
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o banco de dados está rodando

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

## CUSTOS DETALHADOS (Valores em USD)

### Cenário 1: Conta Nova com Free Tier (Primeiros 12 meses)
**Recursos gratuitos por 12 meses:**
- EC2 t3.micro: 750 horas/mês (100% gratuito)
- RDS db.t3.micro: 750 horas/mês (100% gratuito)
- 20 GB de armazenamento RDS (gratuito)
- 15 GB de transferência de dados (gratuito)

**Custos apenas para:**
- Elastic Load Balancer: $18/mês (se usar alta disponibilidade)

**Total mensal: $0-18** (dependendo se usar load balancer)

### Cenário 2: Após Free Tier ou Conta Existente
**Configuração mínima (para pequenas empresas):**
- EC2 t3.micro: $8.50/mês
- RDS db.t3.micro: $12.60/mês
- Armazenamento 20GB: $2.30/mês
- Transferência de dados: $1-5/mês
- **Total: $24-28/mês**

**Configuração recomendada (para uso comercial):**
- EC2 t3.small: $16.80/mês
- RDS db.t3.small: $25.20/mês
- Armazenamento 100GB: $11.50/mês
- Load Balancer: $18/mês
- Transferência de dados: $5-15/mês
- **Total: $76-86/mês**

### Cenário 3: Empresa Média/Grande
**Configuração para alta performance:**
- EC2 t3.medium: $33.60/mês
- RDS db.t3.medium: $50.40/mês
- Armazenamento 500GB: $57.50/mês
- Load Balancer + Auto Scaling: $25/mês
- CloudFront CDN: $5-20/mês
- **Total: $171-186/mês**

### Dicas para Reduzir Custos:
1. **Use Reserved Instances** (desconto de 30-60% se pagar por 1-3 anos)
2. **Configure Auto Scaling** (reduz custo quando não há uso)
3. **Monitore com CloudWatch** (identifica recursos não utilizados)
4. **Use Spot Instances** para desenvolvimento (desconto de até 90%)

## TROUBLESHOOTING DETALHADO

### Problema 1: "Aplicação não inicia" ou "Health Status: Severe"

**Sintomas:**
- Status vermelho no Elastic Beanstalk
- Erro 502/503 ao acessar URL
- Logs mostram falha na inicialização

**Passos para resolver:**

1. **Verificar logs detalhados:**
   - Elastic Beanstalk → Logs → Request Logs → Last 100 Lines
   - Procure por erros como "Cannot connect to database" ou "Error starting server"

2. **Verificar variáveis de ambiente:**
   - Configuration → Software → Environment properties
   - Confirme se DATABASE_URL está no formato correto:
     `postgresql://postgres:SENHA@ENDPOINT:5432/workday`

3. **Verificar se banco está rodando:**
   - RDS Console → Databases → workday-database
   - Status deve ser "Available"

4. **Testar conexão localmente:**
   ```bash
   psql -h SEU_ENDPOINT -U postgres -d workday
   ```

### Problema 2: "Erro de conexão com banco de dados"

**Sintomas:**
- Aplicação inicia mas dá erro ao fazer login
- Logs mostram "connection refused" ou "timeout"

**Soluções:**

1. **Verificar Security Groups:**
   - EC2 → Security Groups
   - Confirme que RDS aceita conexões do Elastic Beanstalk
   - Regra deve ser: PostgreSQL (5432) ← Security Group do EB

2. **Verificar endpoint do banco:**
   - RDS → Databases → workday-database → Connectivity & security
   - Copie exatamente o endpoint (sem espaços extras)

3. **Testar com ferramenta externa:**
   - Use DBeaver, pgAdmin ou similar
   - Teste conexão com os mesmos dados da DATABASE_URL

### Problema 3: "502 Bad Gateway" ou "504 Gateway Timeout"

**Sintomas:**
- Página carrega mas mostra erro 502/504
- Aplicação funciona intermitentemente

**Soluções:**

1. **Verificar memória e CPU:**
   - Elastic Beanstalk → Monitoring
   - Se CPU > 80% ou Memory > 90%, considere instância maior

2. **Verificar porta da aplicação:**
   - Aplicação deve usar `process.env.PORT` (não porta fixa)
   - AWS define porta automaticamente

3. **Aumentar timeout:**
   - Configuration → Load balancer → Edit
   - Idle timeout: 60 segundos

### Problema 4: "Build falha no upload"

**Sintomas:**
- Deploy falha durante upload
- Erro sobre tamanho do arquivo ou estrutura

**Soluções:**

1. **Verificar estrutura do ZIP:**
   - ZIP deve conter arquivos na raiz (não pasta dist/)
   - Estrutura correta:
     ```
     workday-app.zip
     ├── server/
     ├── shared/
     ├── .ebextensions/
     ├── package.json
     └── package-lock.json
     ```

2. **Verificar tamanho:**
   - Máximo 512MB por ZIP
   - Remova node_modules se existir no ZIP

### Problema 5: "Variáveis de ambiente não aplicadas"

**Sintomas:**
- Aplicação não reconhece DATABASE_URL
- Logs mostram "undefined" para variáveis

**Soluções:**

1. **Reaplicar configurações:**
   - Configuration → Software → Edit
   - Adicione variáveis novamente
   - Apply changes e aguarde reinicialização

2. **Verificar sintaxe:**
   - Sem espaços antes/depois do nome da variável
   - Valores entre aspas se contém caracteres especiais

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

### Deploy de atualizações futuras:
```bash
# Quando quiser atualizar a aplicação:
node build-for-aws.js
# Crie novo ZIP e faça upload no Elastic Beanstalk
```

## RESUMO DO PROCESSO COMPLETO

### Checklist para Deploy:
- [ ] 1. Executar `node build-for-aws.js`
- [ ] 2. Compactar conteúdo da pasta `dist/` em ZIP
- [ ] 3. Criar banco RDS PostgreSQL
- [ ] 4. Criar aplicação no Elastic Beanstalk
- [ ] 5. Fazer upload do ZIP
- [ ] 6. Configurar variáveis de ambiente
- [ ] 7. Configurar Security Groups
- [ ] 8. Testar aplicação (login: admin/master123)

### Tempo estimado total: 45-60 minutos

### Próximos passos recomendados:
1. **Monitoramento:** Configure alertas para CPU/memória altos
2. **Backup:** RDS já faz backup automático (7 dias)
3. **Domínio:** Configure domínio personalizado via Route 53
4. **SSL:** Certificate Manager para HTTPS
5. **Performance:** CloudFront CDN para usuários globais
6. **CI/CD:** GitHub Actions para deploy automático

### Suporte técnico:
- Documentação AWS Elastic Beanstalk
- AWS Support (planos pagos)
- Comunidade AWS re:Post
- Stack Overflow para questões específicas

### Contatos de emergência:
- AWS Status Page: Para verificar se há problemas na AWS
- Billing Dashboard: Para monitorar custos
- CloudWatch: Para logs e monitoramento em tempo real