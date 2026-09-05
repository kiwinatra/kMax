// src/core/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[KMOD]';

const COLORS = {
    debug: '#888',
    info: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

// Флаг для включения/отключения логов (можно вынести в storage)
let isEnabled = true;

export const logger = {
    /**
     * Включить/выключить логирование
     */
    setEnabled(enabled: boolean): void {
        isEnabled = enabled;
    },

    debug(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('debug', ...args);
    },

    info(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('info', ...args);
    },

    warn(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('warn', ...args);
    },

    error(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('error', ...args);
    },

    log(level: LogLevel, ...args: unknown[]): void {
        if (!isEnabled) return;
        const color = COLORS[level];
        console.log(`%c${PREFIX}`, `color: ${color}; font-weight: bold;`, ...args);
    },

    group(label: string): void {
        if (!isEnabled) return;
        console.group(`${PREFIX} ${label}`);
    },

    groupEnd(): void {
        if (!isEnabled) return;
        console.groupEnd();
    },

    table(data: unknown): void {
        if (!isEnabled) return;
        console.table(data);
    },

    /**
     * Безопасное логирование ошибок с сохранением стека
     */
    errorWithStack(error: Error, context?: string): void {
        if (!isEnabled) return;
        console.error(`${PREFIX} ${context || 'Error'}:`, error);
        if (error.stack) {
            console.debug(`${PREFIX} Stack:`, error.stack);
        }
    },

    /**
     * Логирование производительности (время выполнения)
     */
    time(label: string, fn: () => void): void {
        if (!isEnabled) {
            fn();
            return;
        }
        console.time(`${PREFIX} ${label}`);
        try {
            fn();
        } finally {
            console.timeEnd(`${PREFIX} ${label}`);
        }
    },

    /**
     * Асинхронное логирование производительности
     */
    async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        if (!isEnabled) {
            return fn();
        }
        console.time(`${PREFIX} ${label}`);
        try {
            return await fn();
        } finally {
            console.timeEnd(`${PREFIX} ${label}`);
        }
    },
};

// Экспортируем для совместимости с старым кодом
export default logger;