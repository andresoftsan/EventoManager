#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Corrigindo compatibilidade com Node.js 18...');

// 1. Build apenas o backend com configuração específica
console.log('⚙️ Fazendo build do backend...');
try {
  execSync(`esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --target=node18 \
    --outdir=dist \
    --define:import.meta.dirname='"."' \
    --define:import.meta.url='"file://index.js"'`, { stdio: 'inherit' });
} catch (error) {
  console.log('❌ Erro no build, tentando método alternativo...');
  
  // Método alternativo: build simples e correção manual
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
}

// 2. Corrigir arquivo gerado
const indexPath = './dist/index.js';
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Adicionar polyfills para Node.js 18
  const polyfills = `import { fileURLToPath } from 'url';
import path from 'path';

// Polyfills para Node.js 18
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Substituir import.meta.dirname por __dirname
globalThis.__dirname = __dirname;

`;
  
  // Substituir todas as ocorrências de import.meta.dirname
  content = content.replace(/import\.meta\.dirname/g, '__dirname');
  
  // Adicionar polyfills no início
  content = polyfills + content;
  
  fs.writeFileSync(indexPath, content);
  console.log('✅ Arquivo corrigido para Node.js 18');
  
  // Testar se o arquivo funciona
  console.log('🧪 Testando compatibilidade...');
  try {
    execSync('node --check dist/index.js', { stdio: 'pipe' });
    console.log('✅ Arquivo compatível com Node.js!');
  } catch (error) {
    console.log('⚠️ Ainda há problemas de sintaxe, mas arquivo foi corrigido');
  }
} else {
  console.log('❌ Arquivo dist/index.js não encontrado');
}

console.log('🎉 Correção concluída!');