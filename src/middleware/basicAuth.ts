import { Request, Response, NextFunction } from 'express';

export const basicAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Basic Auth é obrigatório'
    });
    return;
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    const validUsername = process.env.WEBHOOK_USERNAME;
    const validPassword = process.env.WEBHOOK_PASSWORD;

    if (username === validUsername && password === validPassword) {
      next();
    } else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciais inválidas'
      });
    }
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Formato de Basic Auth inválido'
    });
  }
};