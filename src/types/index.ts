import { Request, Response } from 'express';

export interface IImageHandler {
  handle(req: Request, res: Response): Promise<void>;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'error';
  user: string;
  endpoint: string;
  params: Record<string, any>;
  duration: number;
  result: 'success' | 'error';
  message?: string;
}

export interface ILogger {
  log(entry: LogEntry): Promise<void>;
}
