import express from 'express';
import bodyParser from 'body-parser';
import { handleIncomingData } from './utils/handleIncomingData';
import { startPolling } from './pooling';
import { setupAgentRoutes } from './api/agentRoute';

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json({ limit: '50mb' }));

let webhookReceived = false;

app.post('/webhook', (req: any, res: any) => {
  console.log('[Webhook] Dados recebidos:', req.body);
  webhookReceived = true;
  handleIncomingData(req.body);
  res.status(200).send('Webhook recebido com sucesso');
});

app.get('/health', (req: any, res: any) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

setupAgentRoutes(app);

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  console.log(`Health check: ${PORT}/health`);
  console.log(`Tech Support: ${PORT}/tech-support`);
  console.log(`Webhook: ${PORT}`);
});