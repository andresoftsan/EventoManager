#!/bin/bash

echo "🚀 Criando build otimizado para AWS..."

# 1. Build apenas do backend (mais rápido)
echo "⚙️ Build do backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --target=node18 \
  --outdir=aws-dist \
  --define:process.env.NODE_ENV='"production"'

# 2. Corrigir compatibilidade Node.js 18
echo "🔧 Corrigindo compatibilidade..."
node -e "
const fs = require('fs');
let content = fs.readFileSync('./aws-dist/index.js', 'utf8');

// Polyfills para Node.js 18
const polyfills = \`import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

\`;

// Corrigir imports e substituições
content = content.replace(/import path from \"path\";/g, '');
content = content.replace(/import\.meta\.dirname/g, '__dirname');
content = content.replace(/await import\\(\"@replit\\/vite-plugin-cartographer\"\\)[^}]+}/g, '');
content = content.replace(/runtimeErrorOverlay\\(\\),?/g, '');

fs.writeFileSync('./aws-dist/index.js', polyfills + content);
"

# 3. Criar package.json de produção
echo "📋 Criando package.json..."
cat > aws-dist/package.json << 'EOF'
{
  "name": "workday-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 4. Criar ecosystem.config.js para PM2
echo "⚙️ Criando configuração PM2..."
cat > aws-dist/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'workday',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

echo "✅ Build para AWS concluído!"
echo ""
echo "📁 Arquivos gerados em: ./aws-dist/"
echo ""
echo "🔧 Para usar no AWS:"
echo "1. Copie a pasta aws-dist para seu servidor"
echo "2. Configure .env com DATABASE_URL e SESSION_SECRET"
echo "3. Execute: pm2 start ecosystem.config.js"
echo ""
echo "🧪 Para testar localmente:"
echo "cd aws-dist && DATABASE_URL='sua_url' SESSION_SECRET='sua_chave' node index.js"