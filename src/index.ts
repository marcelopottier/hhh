import express from 'express';
import bodyParser from 'body-parser';
import { handleIncomingData } from './utils/handleIncomingData';
import { startPolling } from './pooling';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use('/chat', chatRouter);

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

setInterval(async () => {
  if (!webhookReceived) {
    console.log('[Polling] Nenhum webhook recebido. Iniciando polling...');
    await startPolling();
  } else {
    webhookReceived = false;
  }
}, 15000);

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Procedimentos: http://localhost:${PORT}/api/procedimentos`);
});