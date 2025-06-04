#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔨 Iniciando build para produção...');

// 1. Build do frontend
console.log('📦 Fazendo build do frontend...');
execSync('vite build', { stdio: 'inherit' });

// 2. Build do backend com configuração específica para Node.js 18
console.log('⚙️ Fazendo build do backend...');
execSync(`esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --target=node18 \
  --outdir=dist \
  --define:import.meta.dirname="process.cwd()" \
  --define:import.meta.url='"file://" + __filename'`, { stdio: 'inherit' });

// 3. Corrigir imports problemáticos no arquivo gerado
console.log('🔧 Corrigindo compatibilidade com Node.js 18...');
const indexPath = path.join(__dirname, 'dist', 'index.js');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Substituir import.meta.dirname por process.cwd()
  content = content.replace(/import\.meta\.dirname/g, 'process.cwd()');
  
  // Adicionar __dirname e __filename polyfills no topo
  const polyfills = `import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

`;
  
  content = polyfills + content;
  
  fs.writeFileSync(indexPath, content);
  console.log('✅ Arquivo corrigido para compatibilidade com Node.js 18');
}

// 4. Criar package.json para produção
console.log('📋 Criando package.json para produção...');
const prodPackage = {
  name: "workday-production",
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

fs.writeFileSync(path.join(__dirname, 'dist', 'package.json'), JSON.stringify(prodPackage, null, 2));

console.log('🎉 Build concluído! Arquivos em ./dist/');
console.log('💡 Para executar: cd dist && npm start');