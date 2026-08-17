type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[KMOD]';

const COLORS = {
    debug: '#888',
    info: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

export const logger = {
    debug(...args: unknown[]): void {
        this.log('debug', ...args);
    },

    info(...args: unknown[]): void {
        this.log('info', ...args);
    },

    warn(...args: unknown[]): void {
        this.log('warn', ...args);
    },

    error(...args: unknown[]): void {
        this.log('error', ...args);
    },

    log(level: LogLevel, ...args: unknown[]): void {
        const color = COLORS[level];
        console.log(`%c${PREFIX}`, `color: ${color}; font-weight: bold;`, ...args);
    },

    group(label: string): void {
        console.group(`${PREFIX} ${label}`);
    },

    groupEnd(): void {
        console.groupEnd();
    },

    table(data: unknown): void {
        console.table(data);
    },
};