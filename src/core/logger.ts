/*
* @author: potemk.in
* @brief: Lightweight logger with level filtering and zero-cost disabled paths.
* @desc: debug/info are silent unless `kmod_debug` storage flag is true or
*       logView is active. warn/error always print. No `%c` styles are built
*       when the level is off — the check happens before any string work.
*       The logView feature does NOT need to know about this; it intercepts
*       console directly.
*/

import { storage } from './storage';

// ============================================================
// TYPES
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================
// CONSTANTS
// ============================================================

const PREFIX = '[KMOD]';

const COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

const DEBUG_FLAG_KEY = 'kmod_debug';

// ============================================================
// STATE
// ============================================================

let enabled = true;
let verboseCached: boolean | null = null;
let verboseCachedAt = 0;

const VERBOSE_CACHE_TTL = 1000; // ms

// ============================================================
// VERBOSE FLAG
// ============================================================

/**
 * Whether debug/info should actually print.
 * Cached for 1s to avoid hammering storage during log bursts.
 */
function isVerbose(): boolean {
    const now = Date.now();
    if (verboseCached !== null && now - verboseCachedAt < VERBOSE_CACHE_TTL) {
        return verboseCached;
    }

    let value = false;
    try {
        if (localStorage.getItem(DEBUG_FLAG_KEY) === 'true') {
            value = true;
        } else {
            value = storage.getBoolean('logView');
        }
    } catch {
        value = false;
    }

    verboseCached = value;
    verboseCachedAt = now;
    return value;
}

/** Force a re-read of the verbose flag on the next log call. */
export function refreshLogger(): void {
    verboseCached = null;
}

// ============================================================
// LOGGER
// ============================================================

export const logger = {
    setEnabled(value: boolean): void {
        enabled = value;
    },

    debug(...args: unknown[]): void {
        if (!enabled || !isVerbose()) return;
        console.log(`%c${PREFIX}`, `color:${COLORS.debug};font-weight:bold`, ...args);
    },

    info(...args: unknown[]): void {
        if (!enabled || !isVerbose()) return;
        console.log(`%c${PREFIX}`, `color:${COLORS.info};font-weight:bold`, ...args);
    },

    warn(...args: unknown[]): void {
        if (!enabled) return;
        console.warn(`%c${PREFIX}`, `color:${COLORS.warn};font-weight:bold`, ...args);
    },

    error(...args: unknown[]): void {
        if (!enabled) return;
        console.error(`%c${PREFIX}`, `color:${COLORS.error};font-weight:bold`, ...args);
    },

    /** Explicit-level log — same filtering rules as above. */
    log(level: LogLevel, ...args: unknown[]): void {
        if (!enabled) return;
        if ((level === 'debug' || level === 'info') && !isVerbose()) return;
        const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        method.call(console, `%c${PREFIX}`, `color:${COLORS[level]};font-weight:bold`, ...args);
    },

    group(label: string): void {
        if (!enabled || !isVerbose()) return;
        console.group(`${PREFIX} ${label}`);
    },

    groupEnd(): void {
        if (!enabled || !isVerbose()) return;
        console.groupEnd();
    },

    table(data: unknown): void {
        if (!enabled || !isVerbose()) return;
        console.table(data);
    },

    errorWithStack(error: Error, context?: string): void {
        if (!enabled) return;
        console.error(`${PREFIX} ${context || 'Error'}:`, error);
        if (error.stack) {
            console.debug(`${PREFIX} Stack:`, error.stack);
        }
    },

    time(label: string, fn: () => void): void {
        if (!enabled || !isVerbose()) {
            fn();
            return;
        }
        const tag = `${PREFIX} ${label}`;
        console.time(tag);
        try {
            fn();
        } finally {
            console.timeEnd(tag);
        }
    },

    async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        if (!enabled || !isVerbose()) {
            return fn();
        }
        const tag = `${PREFIX} ${label}`;
        console.time(tag);
        try {
            return await fn();
        } finally {
            console.timeEnd(tag);
        }
    },
};

export default logger;