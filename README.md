# Workday - Sistema de Gestão Empresarial

Sistema de gestão empresarial completo desenvolvido em React/TypeScript e Node.js, otimizado para o contexto brasileiro.

## Funcionalidades

- **Dashboard**: Estatísticas de tarefas e eventos em tempo real
- **Agenda**: Calendário com gerenciamento de eventos
- **Tarefas**: Sistema completo com Kanban e sprints
- **Clientes**: Gestão de clientes com validação CNPJ
- **Configurações**: Gerenciamento de usuários (admin)
- **Autenticação**: Sistema de login seguro

## Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Autenticação**: Express Session
- **Build**: Vite, ESBuild
- **Deploy**: Compatível com AWS, Render, Railway

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd workday

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute em desenvolvimento
npm run dev
```

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
SESSION_SECRET=sua_chave_secreta_longa
NODE_ENV=development
PORT=5000
```

## Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run start        # Executa build
npm run db:push      # Sincroniza schema do banco
```

## Deploy

### AWS/VPS
```bash
# Gere build otimizado
./aws-build.sh

# Copie pasta aws-dist para servidor
# Configure .env no servidor
# Execute: pm2 start ecosystem.config.js
```

### Render/Railway
Use o comando padrão `npm run build && npm run start`

## Estrutura do Projeto

```
├── client/          # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   └── lib/         # Utilitários
├── server/          # Backend Node.js
│   ├── index.ts     # Servidor principal
│   ├── routes.ts    # Rotas da API
│   └── storage.ts   # Interface de dados
├── shared/          # Tipos compartilhados
└── aws-build.sh     # Script de deploy
```

## Usuário Padrão

```
Usuário: admin
Senha: master123
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## Licença

MIT License