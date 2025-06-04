#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔨 Criando build de produção otimizado...');

// 1. Build apenas do backend, sem plugins do Replit
console.log('⚙️ Build do backend...');
execSync(`esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --target=node18 \
  --outdir=dist \
  --define:process.env.NODE_ENV='"production"'`, { stdio: 'inherit' });

// 2. Corrigir import.meta.dirname
const indexPath = './dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Polyfills para Node.js 18
const polyfills = `import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar NODE_ENV se não estiver definido
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

`;

// Remover imports duplicados e corrigir
content = content.replace(/import path from "path";/g, '');
content = content.replace(/import\.meta\.dirname/g, '__dirname');

// Remover plugins do Replit em produção
content = content.replace(/await import\("@replit\/vite-plugin-cartographer"\)\.then\([^}]+\}/g, '');
content = content.replace(/runtimeErrorOverlay\(\),?/g, '');

content = polyfills + content;

fs.writeFileSync(indexPath, content);

// 3. Criar arquivo de entrada simplificado
const prodIndex = `import dotenv from 'dotenv';
dotenv.config();

// Configurar porta para produção
process.env.PORT = process.env.PORT || '3000';

// Importar aplicação
import('./index.js');
`;

fs.writeFileSync('./dist/server.js', prodIndex);

console.log('✅ Build de produção criado!');
console.log('📋 Para testar: node dist/server.js');
console.log('🚀 Para AWS: usar arquivo dist/server.js como entrada');