# Configuração da Chave de API Externa

## Como Configurar a Chave da API

A chave da API externa é configurada através da variável de ambiente `EXTERNAL_API_KEY`.

### Método 1: Arquivo .env (Recomendado para desenvolvimento)

1. Abra o arquivo `.env` na raiz do projeto
2. Localize ou adicione a linha:
   ```
   EXTERNAL_API_KEY=sua-chave-super-secreta-aqui
   ```
3. Substitua `sua-chave-super-secreta-aqui` pela chave desejada
4. Reinicie o servidor para aplicar as mudanças

**Exemplo:**
```bash
# No arquivo .env
EXTERNAL_API_KEY=minha-chave-api-2024-xyz123
```

### Método 2: Variável de Ambiente do Sistema (Recomendado para produção)

Para ambientes de produção, configure diretamente no sistema:

**Linux/macOS:**
```bash
export EXTERNAL_API_KEY="sua-chave-super-secreta-aqui"
```

**Windows:**
```cmd
set EXTERNAL_API_KEY=sua-chave-super-secreta-aqui
```

**Docker:**
```bash
docker run -e EXTERNAL_API_KEY="sua-chave-super-secreta-aqui" seu-container
```

### Método 3: Plataformas de Deploy

**Replit:**
- Vá em "Secrets" no painel lateral
- Adicione uma nova secret com key: `EXTERNAL_API_KEY`
- Value: sua chave secreta

**Heroku:**
```bash
heroku config:set EXTERNAL_API_KEY="sua-chave-super-secreta-aqui"
```

**Vercel:**
```bash
vercel env add EXTERNAL_API_KEY
```

**Railway/Render:**
- Configure nas variáveis de ambiente do painel de controle

## Gerando uma Chave Segura

Para gerar uma chave segura, você pode usar:

**Node.js:**
```javascript
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log(apiKey);
```

**Linux/macOS:**
```bash
openssl rand -hex 32
```

**Online:**
- Use geradores de senhas confiáveis
- Recomendo pelo menos 32 caracteres
- Use combinação de letras, números e símbolos

## Verificando se a Chave Está Ativa

Depois de configurar, teste com:

```bash
curl -X GET "http://seu-servidor/api/external/clients/cnpj/12345678000190" \
  -H "x-api-key: sua-chave-configurada"
```

**Resposta esperada se não configurada:**
```json
{
  "message": "Chave de API inválida ou ausente. Use o header 'x-api-key'."
}
```

**Resposta esperada se configurada corretamente:**
```json
{
  "message": "Cliente não encontrado"
}
```
(ou dados do cliente se existir)

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commit a chave no código fonte
- Use diferentes chaves para desenvolvimento e produção
- Mantenha as chaves em local seguro
- Rotate as chaves periodicamente
- Monitore o uso da API para detectar abusos

## Troubleshooting

**Problema: "Chave de API inválida"**
- Verifique se a variável está definida
- Reinicie o servidor após alterar o .env
- Confirme que está usando o header correto: `x-api-key`

**Problema: Servidor não reconhece a variável**
- Verifique se o arquivo .env está na raiz do projeto
- Confirme que não há espaços antes/depois do =
- Verifique se o dotenv está sendo carregado no server/index.ts