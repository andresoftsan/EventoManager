# Corrigir Erro 502 Bad Gateway na AWS

## Causa do Erro 502

O erro 502 Bad Gateway significa que:
- A aplicação não está iniciando
- Erro na porta da aplicação
- Problema nas variáveis de ambiente
- Erro de conexão com banco de dados

## Solução Passo a Passo

### 1. Verificar Logs da Aplicação

**No Elastic Beanstalk:**
1. Vá para sua aplicação
2. Logs → Request Logs → Last 100 Lines
3. Procure por erros específicos

**Erros comuns nos logs:**
- "Cannot connect to database"
- "Port already in use" 
- "Environment variable not defined"
- "Module not found"

### 2. Verificar Variáveis de Ambiente

**Confirme se estão configuradas:**
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:senha@endpoint:5432/workday
SESSION_SECRET=sua_chave_secreta
```

### 3. Corrigir Problema da Porta

A aplicação deve usar `process.env.PORT` da AWS, não porta fixa.

**Verificar em server/index.ts:**
```javascript
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

### 4. Verificar Conexão com Banco

**Problema comum:** Security Groups mal configurados

**Solução:**
1. EC2 → Security Groups
2. Encontre o grupo do RDS (workday-db-sg)
3. Edit inbound rules
4. Adicionar regra:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Security Group do Elastic Beanstalk

### 5. Verificar Build da Aplicação

**Problema:** Arquivo dist/index.js não foi criado

**Solução:**
```bash
# Executar build novamente
npm run build
# Verificar se dist/index.js existe
ls -la dist/
```

## Script de Verificação Automática