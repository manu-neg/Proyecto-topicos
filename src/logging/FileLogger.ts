import fs from 'fs/promises';
import path from 'path';
import { ILogger, LogEntry } from '../types';

export class FileLogger implements ILogger {
  private logPath = path.join(__dirname, '../../logs/app.log');

  async log(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    await fs.appendFile(this.logPath, line);
  }
}
