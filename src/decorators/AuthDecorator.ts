import { Request, Response } from 'express';
import { IImageHandler } from '../types';
import jwt from 'jsonwebtoken';

export class AuthDecorator implements IImageHandler {
  constructor(private readonly inner: IImageHandler) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const token = req.header('Authorization')?.split(' ')[1];
      if (!token) throw new Error('Token ausente');

      const secret = process.env.JWT_SECRET || 'secret';
      const verified = jwt.verify(token, secret);
      (req as any).user = verified;

      await this.inner.handle(req, res);
    } catch (error) {
      res.status(401).json({ error: 'Token inválido o ausente' });
    }
  }
}
