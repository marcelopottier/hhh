import axios from 'axios';
import { handleIncomingData } from './utils/handleIncomingData';

export async function startPolling() {
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
    const mockData = {
      id: 'polling-' + Date.now(),
      payload: response.data,
      timestamp: new Date().toISOString()
    };
    console.log('[Polling] Dados obtidos via polling:', mockData);
    handleIncomingData(mockData);
  } catch (error) {
    console.error('[Polling] Erro ao fazer polling:', error);
  }
}
