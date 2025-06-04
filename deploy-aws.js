#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Preparando aplicação para AWS...');

// 1. Build do frontend
console.log('📦 Build do frontend...');
execSync('vite build', { stdio: 'inherit' });

// 2. Build do backend compatível com Node.js 18
console.log('⚙️ Build do backend...');
execSync(`esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --target=node18 \
  --outdir=dist-aws \
  --define:process.env.NODE_ENV='"production"'`, { stdio: 'inherit' });

// 3. Corrigir arquivo para Node.js 18
const indexPath = './dist-aws/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Polyfills para Node.js 18
const polyfills = `import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

`;

// Remover imports duplicados e substituir import.meta.dirname
content = content.replace(/import path from "path";/g, '');
content = content.replace(/import\.meta\.dirname/g, '__dirname');

// Remover plugins específicos do Replit
content = content.replace(/await import\("@replit\/vite-plugin-cartographer"\)[^}]+}/g, '');
content = content.replace(/runtimeErrorOverlay\(\),?/g, '');

content = polyfills + content;
fs.writeFileSync(indexPath, content);

// 4. Copiar arquivos do frontend
execSync('cp -r dist/public dist-aws/', { stdio: 'inherit' });

// 5. Criar package.json para produção
const prodPackage = {
  name: "workday-aws",
  version: "1.0.0",
  type: "module",
  main: "index.js",
  scripts: {
    start: "node index.js"
  },
  engines: {
    node: ">=18.0.0"
  }
};

fs.writeFileSync('./dist-aws/package.json', JSON.stringify(prodPackage, null, 2));

// 6. Criar ecosystem.config.js para PM2
const pm2Config = `module.exports = {
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
}`;

fs.writeFileSync('./dist-aws/ecosystem.config.js', pm2Config);

console.log('✅ Build para AWS concluído!');
console.log('📁 Arquivos em: ./dist-aws/');
console.log('');
console.log('📋 Comandos para AWS:');
console.log('1. Copiar pasta dist-aws para seu servidor');
console.log('2. No servidor: npm install --production');
console.log('3. Configurar variáveis no .env:');
console.log('   DATABASE_URL=sua_string_postgresql');
console.log('   SESSION_SECRET=sua_chave_secreta');
console.log('4. Executar: pm2 start ecosystem.config.js');