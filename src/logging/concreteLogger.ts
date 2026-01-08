import { ILogger, LogEntry } from "../types";


class Timestamp implements LogEntry {
    constructor(
        public timestamp: string,
        public level: 'info' | 'error',
        public user: string,
        public endpoint: string,
        public params: any,
        public duration: number,
        public result: 'success' | 'error',
        public message?: string
    ) {}

    static fromLogEntry(entry: LogEntry): Timestamp {
        return new Timestamp(
            entry.timestamp,
            entry.level,
            entry.user,
            entry.endpoint,
            entry.params,
            entry.duration,
            entry.result,
            entry.message
        );
    }

    convertString(): string {
        return `[${this.timestamp}] [${this.level.toUpperCase()}] User: ${this.user}, Endpoint: ${this.endpoint}, Duration: ${this.duration}ms, Result: ${this.result}${this.message ? ', Message: ' + this.message : ''}`;
    }
}

class ConcreteLogger implements ILogger {
    constructor() {}
    async log(entry: Timestamp): Promise<void> {
        console.log(entry.convertString());
    }
}

export { ConcreteLogger, Timestamp };