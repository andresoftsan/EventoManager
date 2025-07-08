# API Externa para Integração de Clientes

Esta API permite que sistemas de terceiros integrem com o Workday para criar, atualizar e consultar clientes.

## Configuração da API Key

Para usar esta API, você precisa configurar uma chave de API no ambiente:

```bash
EXTERNAL_API_KEY=sua-chave-secreta-aqui
```

## Autenticação

Todos os endpoints requerem autenticação via header `x-api-key`:

```bash
x-api-key: sua-chave-secreta-aqui
```

## Endpoints Disponíveis

### 1. Criar Cliente

**POST** `/api/external/clients`

Cria um novo cliente no sistema.

**Headers:**
```
Content-Type: application/json
x-api-key: sua-chave-secreta-aqui
```

**Body JSON:**
```json
{
  "razaoSocial": "Empresa Exemplo LTDA",
  "nomeFantasia": "Empresa Exemplo",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@empresa.com",
  "telefone": "(11) 99999-9999",
  "endereco": "Rua Exemplo, 123 - São Paulo/SP"
}
```

**Resposta de Sucesso (201):**
```json
{
  "message": "Cliente criado com sucesso",
  "client": {
    "id": 1,
    "razaoSocial": "Empresa Exemplo LTDA",
    "nomeFantasia": "Empresa Exemplo",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@empresa.com",
    "telefone": "(11) 99999-9999",
    "endereco": "Rua Exemplo, 123 - São Paulo/SP"
  }
}
```

**Resposta de Erro (409) - Cliente já existe:**
```json
{
  "message": "Cliente já existe com este CNPJ",
  "existingClient": {
    "id": 1,
    "razaoSocial": "Empresa Exemplo LTDA",
    "cnpj": "12.345.678/0001-90"
  }
}
```

### 2. Atualizar Cliente

**PUT** `/api/external/clients/:id`

Atualiza um cliente existente.

**Headers:**
```
Content-Type: application/json
x-api-key: sua-chave-secreta-aqui
```

**Body JSON (todos os campos são opcionais):**
```json
{
  "razaoSocial": "Empresa Exemplo LTDA - Atualizada",
  "nomeFantasia": "Empresa Exemplo",
  "email": "novo-contato@empresa.com",
  "telefone": "(11) 88888-8888",
  "endereco": "Rua Nova, 456 - São Paulo/SP"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Cliente atualizado com sucesso",
  "client": {
    "id": 1,
    "razaoSocial": "Empresa Exemplo LTDA - Atualizada",
    "nomeFantasia": "Empresa Exemplo",
    "cnpj": "12.345.678/0001-90",
    "email": "novo-contato@empresa.com",
    "telefone": "(11) 88888-8888",
    "endereco": "Rua Nova, 456 - São Paulo/SP"
  }
}
```

### 3. Buscar Cliente por CNPJ

**GET** `/api/external/clients/cnpj/:cnpj`

Busca um cliente específico pelo CNPJ.

**Headers:**
```
x-api-key: sua-chave-secreta-aqui
```

**Exemplo de URL:**
```
GET /api/external/clients/cnpj/12.345.678%2F0001-90
```

**Nota importante:** Para CNPJs com caracteres especiais (barras, pontos), use URL encoding:
- `/` deve ser codificado como `%2F`
- Exemplo: `12.345.678/0001-90` → `12.345.678%2F0001-90`

**Resposta de Sucesso (200):**
```json
{
  "client": {
    "id": 1,
    "razaoSocial": "Empresa Exemplo LTDA",
    "nomeFantasia": "Empresa Exemplo",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@empresa.com",
    "telefone": "(11) 99999-9999",
    "endereco": "Rua Exemplo, 123 - São Paulo/SP"
  }
}
```

**Resposta de Erro (404):**
```json
{
  "message": "Cliente não encontrado"
}
```

## Códigos de Erro

- **401 Unauthorized:** Chave de API inválida ou ausente
- **400 Bad Request:** Dados inválidos no corpo da requisição
- **404 Not Found:** Cliente não encontrado
- **409 Conflict:** Cliente já existe com o CNPJ informado
- **500 Internal Server Error:** Erro interno do servidor

## Validação de Dados

### Campos Obrigatórios (POST):
- `razaoSocial`: string, mínimo 1 caractere

### Campos Opcionais:
- `nomeFantasia`: string
- `cnpj`: string (formato livre)
- `email`: string (deve ser um email válido)
- `telefone`: string
- `endereco`: string

## Exemplo de Uso com cURL

### Criar cliente:
```bash
curl -X POST http://localhost:5000/api/external/clients \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-secreta-aqui" \
  -d '{
    "razaoSocial": "Empresa Teste LTDA",
    "nomeFantasia": "Empresa Teste",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@teste.com",
    "telefone": "(11) 99999-9999",
    "endereco": "Rua Teste, 123 - São Paulo/SP"
  }'
```

### Buscar cliente por CNPJ:
```bash
curl -X GET "http://localhost:5000/api/external/clients/cnpj/12.345.678%2F0001-90" \
  -H "x-api-key: sua-chave-secreta-aqui"
```

### Atualizar cliente:
```bash
curl -X PUT http://localhost:5000/api/external/clients/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-secreta-aqui" \
  -d '{
    "telefone": "(11) 88888-8888",
    "endereco": "Rua Nova, 456 - São Paulo/SP"
  }'
```

## Notas Importantes

1. **Segurança:** A chave de API deve ser mantida em segredo e não deve ser exposta em código cliente
2. **CNPJ Único:** O sistema não permite dois clientes com o mesmo CNPJ
3. **Validação:** Todos os dados são validados antes de serem salvos no sistema
4. **Rate Limiting:** Implemente controle de taxa no seu sistema para evitar sobrecarga
5. **Logs:** Erros são logados no servidor para monitoramento

## Suporte

Para dúvidas sobre a API ou problemas de integração, consulte os logs do servidor ou entre em contato com o suporte técnico.