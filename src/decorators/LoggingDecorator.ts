import { Request, Response } from 'express';
import { IImageHandler, ILogger } from '../types';

export class LoggingDecorator implements IImageHandler {
  constructor(
    private readonly inner: IImageHandler,
    private readonly logger: ILogger
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    const start = Date.now();
    const user = (req as any).user?.email || 'anonymous';
    const endpoint = req.path;
    const params = req.body;

    try {
      await this.inner.handle(req, res);
      await this.logger.log({
        timestamp: new Date().toISOString(),
        level: 'info',
        user,
        endpoint,
        params,
        duration: Date.now() - start,
        result: 'success'
      });
    } catch (error: any) {
      await this.logger.log({
        timestamp: new Date().toISOString(),
        level: 'error',
        user,
        endpoint,
        params,
        duration: Date.now() - start,
        result: 'error',
        message: error.message
      });
      throw error;
    }
  }
}
