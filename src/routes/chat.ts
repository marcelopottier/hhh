import { Router } from 'express';
import { BasicSupportAgent } from '../agents/basicSupportAgent';

const router = Router();
const agent = new BasicSupportAgent();

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Mensagem obrigatória' });
    return;
  }
  try {
    const reply = await agent.processMessage(message);
    res.json({ message: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

export default router;
