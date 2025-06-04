import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env: process.env.NODE_ENV
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'Workday API funcionando!',
    version: '1.0.0'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Node.js ${process.version}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});