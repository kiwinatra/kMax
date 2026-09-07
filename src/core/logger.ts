/*
* @author: potemk.in
* @brief: Logger utility for consistent console logging with color-coded levels and performance tracking.
* @desc: This file provides a logging system with support for debug, info, warn, and error levels, color-coded output, enable/disable toggling, group logging, table output, error stack logging, and performance timing for both synchronous and asynchronous operations.
*/

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[KMOD]';

const COLORS = {
    debug: '#888',
    info: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

let isEnabled = true;

export const logger = {
    // Function for enabling or disabling logging
    setEnabled(enabled: boolean): void {
        isEnabled = enabled;
    },

    // Function for logging debug messages
    debug(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('debug', ...args);
    },

    // Function for logging info messages
    info(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('info', ...args);
    },

    // Function for logging warning messages
    warn(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('warn', ...args);
    },

    // Function for logging error messages
    error(...args: unknown[]): void {
        if (!isEnabled) return;
        this.log('error', ...args);
    },

    // Function for logging with a specific level
    log(level: LogLevel, ...args: unknown[]): void {
        if (!isEnabled) return;
        const color = COLORS[level];
        console.log(`%c${PREFIX}`, `color: ${color}; font-weight: bold;`, ...args);
    },

    // Function for grouping log messages
    group(label: string): void {
        if (!isEnabled) return;
        console.group(`${PREFIX} ${label}`);
    },

    // Function for ending a log group
    groupEnd(): void {
        if (!isEnabled) return;
        console.groupEnd();
    },

    // Function for logging data in table format
    table(data: unknown): void {
        if (!isEnabled) return;
        console.table(data);
    },

    // Function for logging errors with stack trace
    errorWithStack(error: Error, context?: string): void {
        if (!isEnabled) return;
        console.error(`${PREFIX} ${context || 'Error'}:`, error);
        if (error.stack) {
            console.debug(`${PREFIX} Stack:`, error.stack);
        }
    },

    // Function for measuring synchronous execution time
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

    // Function for measuring asynchronous execution time
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

export default logger;