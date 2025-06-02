const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Preparando aplicação para deploy na AWS...');

// 1. Build do frontend
console.log('📦 Fazendo build do frontend...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Copiar arquivos do servidor
console.log('📁 Copiando arquivos do servidor...');
const serverFiles = ['server', 'shared', 'package.json', 'package-lock.json'];
const distPath = path.join(__dirname, 'dist');

// Criar pasta dist se não existir
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}

// Copiar arquivos necessários
serverFiles.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(distPath, file);
  
  if (fs.existsSync(sourcePath)) {
    if (fs.statSync(sourcePath).isDirectory()) {
      execSync(`cp -r "${sourcePath}" "${destPath}"`);
    } else {
      execSync(`cp "${sourcePath}" "${destPath}"`);
    }
    console.log(`✅ Copiado: ${file}`);
  }
});

// 3. Criar package.json específico para produção
const prodPackageJson = {
  "name": "workday-app",
  "version": "1.0.0",
  "description": "Sistema de gestão empresarial Workday",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "postinstall": "npm run db:push",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.30.0",
    "drizzle-kit": "^0.20.0",
    "express": "^4.18.0",
    "express-session": "^1.17.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "connect-pg-simple": "^9.0.0",
    "zod": "^3.22.0",
    "drizzle-zod": "^0.5.0",
    "ws": "^8.16.0"
  },
  "engines": {
    "node": "18.x"
  }
};

fs.writeFileSync(
  path.join(distPath, 'package.json'), 
  JSON.stringify(prodPackageJson, null, 2)
);

console.log('✅ package.json de produção criado');

// 4. Criar arquivo de configuração do Elastic Beanstalk
const ebExtensionsPath = path.join(distPath, '.ebextensions');
if (!fs.existsSync(ebExtensionsPath)) {
  fs.mkdirSync(ebExtensionsPath);
}

const nodeCommandConfig = `option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NPM_USE_PRODUCTION: true
`;

fs.writeFileSync(
  path.join(ebExtensionsPath, '01_nodecommand.config'),
  nodeCommandConfig
);

console.log('✅ Configuração do Elastic Beanstalk criada');

console.log('\n🎉 Aplicação preparada para deploy!');
console.log('📂 Arquivos prontos na pasta: dist/');
console.log('\nPróximos passos:');
console.log('1. Compacte a pasta dist/ em um arquivo ZIP');
console.log('2. Faça upload no AWS Elastic Beanstalk');
console.log('3. Configure as variáveis de ambiente');