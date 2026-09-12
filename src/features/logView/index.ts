/*
* @author: potemk.in
* @brief: Real-time log overlay for console, errors, XHR and fetch.
* @desc: Heavy interception without the lag. Key optimizations:
*       - Log args are stored raw and formatted lazily only when rendered.
*       - A pool of DOM rows is reused instead of creating/removing nodes.
*       - Rendering is rate-limited per animation frame; overflow is dropped.
*       - XHR hooks are installed on the prototype once (no per-instance wrappers).
*       - Mod's own [KMOD] logs are ignored to prevent feedback loops.
*       - Auto-scroll reads layout at most once per frame.
*       - All native APIs are restored cleanly on disable().
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { createElement } from '../../core/dom';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_LOGS = 150;
const MAX_LOGS_PER_FRAME = 15;
const MAX_PENDING = 500;
const MAX_ARG_LENGTH = 400;
const AUTOSCROLL_THRESHOLD = 20;
const KMOD_PREFIX = '[KMOD]';

const LEVEL_COLORS: Record<string, string> = {
    log: '#b5bac1',
    info: '#3ba55c',
    warn: '#faa81a',
    error: '#ed4245',
};

type LogLevel = 'log' | 'info' | 'warn' | 'error';

interface LogEntry {
    time: string;
    type: string;
    level: LogLevel;
    args: unknown[];
}

interface LogRow {
    el: HTMLDivElement;
    time: HTMLSpanElement;
    type: HTMLSpanElement;
    msg: HTMLSpanElement;
}

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
let logWrapper: HTMLDivElement | null = null;
let logContainer: HTMLDivElement | null = null;

const activeRows: LogRow[] = []; // in display order, oldest first
const pendingEntries: LogEntry[] = [];

let rafScheduled = false;
let scrollRafScheduled = false;
let autoScroll = true;

// ============================================================
// INTERCEPTOR BOOKKEEPING
// ============================================================

interface OriginalApis {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
    fetch: typeof window.fetch | null;
    xhrOpen: typeof XMLHttpRequest.prototype.open | null;
    xhrSend: typeof XMLHttpRequest.prototype.send | null;
    beacon: typeof navigator.sendBeacon | null;
}

let originals: OriginalApis | null = null;

// ============================================================
// FAST FORMATTER (no indentation, aggressive truncation)
// ============================================================

function formatArg(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    const t = typeof arg;
    if (t === 'string') return arg as string;
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(arg);
    if (t === 'function') return '[Function]';
    if (t === 'symbol') return (arg as symbol).toString();
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;

    try {
        const s = JSON.stringify(arg);
        return s.length > MAX_ARG_LENGTH ? s.slice(0, MAX_ARG_LENGTH) + '…' : s;
    } catch {
        return String(arg);
    }
}

function formatArgs(args: unknown[]): string {
    if (args.length === 1) return formatArg(args[0]);
    let out = '';
    for (let i = 0; i < args.length; i++) {
        if (i > 0) out += ' ';
        out += formatArg(args[i]);
    }
    return out.length > MAX_ARG_LENGTH ? out.slice(0, MAX_ARG_LENGTH) + '…' : out;
}

// ============================================================
// QUEUE
// ============================================================

function makeTime(): string {
    const d = new Date();
    return (
        d.toLocaleTimeString('ru-RU', { hour12: false }) +
        '.' +
        String(d.getMilliseconds()).padStart(3, '0')
    );
}

function queueLog(type: string, level: LogLevel, args: unknown[]): void {
    if (!isEnabled || !logContainer) return;

    // Skip our own logger to avoid feedback loop
    const first = args[0];
    if (typeof first === 'string' && first.includes(KMOD_PREFIX)) return;

    if (pendingEntries.length >= MAX_PENDING) {
        // Drop oldest pending under pressure
        pendingEntries.shift();
    }
    pendingEntries.push({ time: makeTime(), type, level, args });

    scheduleFlush();
}

function scheduleFlush(): void {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(flush);
}

// ============================================================
// ROW POOL
// ============================================================

function createRow(): LogRow {
    const el = createElement('div', {
        styles: {
            display: 'flex',
            gap: '8px',
            fontSize: '12px',
            lineHeight: '1.3',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            opacity: '0.95',
            maxWidth: '90vw',
            padding: '2px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        },
    });

    const time = document.createElement('span');
    time.style.cssText = 'color:#888;flex-shrink:0;min-width:72px;';

    const type = document.createElement('span');
    type.style.cssText = 'font-weight:600;flex-shrink:0;min-width:50px;';

    const msg = document.createElement('span');
    msg.style.cssText = 'color:#f0f0f0;word-break:break-word;';

    el.appendChild(time);
    el.appendChild(type);
    el.appendChild(msg);

    return { el, time, type, msg };
}

function acquireRow(): LogRow {
    if (activeRows.length >= MAX_LOGS) {
        // Reuse the oldest — it will be re-appended at the end.
        const oldest = activeRows.shift()!;
        return oldest;
    }
    const row = createRow();
    activeRows.push(row);
    return row;
}

// ============================================================
// RENDER
// ============================================================

function flush(): void {
    rafScheduled = false;
    if (!logContainer) return;

    if (pendingEntries.length === 0) return;

    const container = logContainer;

    // Check scroll position once per frame (3 layout reads max).
    const wasAtBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - AUTOSCROLL_THRESHOLD;
    if (wasAtBottom) autoScroll = true;

    const budget = Math.min(pendingEntries.length, MAX_LOGS_PER_FRAME);
    for (let i = 0; i < budget; i++) {
        const entry = pendingEntries[i];
        const row = acquireRow();

        row.time.textContent = entry.time;
        row.type.textContent = entry.type;
        row.type.style.color = LEVEL_COLORS[entry.level] || '#888';
        row.el.style.color = LEVEL_COLORS[entry.level] || '#b5bac1';
        row.msg.textContent = formatArgs(entry.args);

        // appendChild moves an existing node to the end — perfect for reuse.
        container.appendChild(row.el);
    }
    pendingEntries.splice(0, budget);

    if (autoScroll) scheduleScroll();

    if (pendingEntries.length > 0) scheduleFlush();
}

function scheduleScroll(): void {
    if (scrollRafScheduled) return;
    scrollRafScheduled = true;
    requestAnimationFrame(() => {
        scrollRafScheduled = false;
        if (logContainer && autoScroll) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    });
}

// ============================================================
// UI
// ============================================================

function createLogUI(): void {
    if (logWrapper) return;

    logWrapper = createElement('div', {
        styles: {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '999999',
            pointerEvents: 'none',
            maxWidth: '80vw',
            maxHeight: '90vh',
            overflow: 'hidden',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#e0e0e0',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
        },
    });

    logContainer = createElement('div', {
        styles: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            maxHeight: 'calc(90vh - 20px)',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            padding: '4px 6px',
        },
    }) as HTMLDivElement;

    // Track user's scroll intent without per-log layout reads.
    logContainer.addEventListener(
        'scroll',
        () => {
            if (!logContainer) return;
            autoScroll =
                logContainer.scrollTop + logContainer.clientHeight >=
                logContainer.scrollHeight - AUTOSCROLL_THRESHOLD;
        },
        { passive: true }
    );

    logWrapper.appendChild(logContainer);
    document.body.appendChild(logWrapper);
}

function teardownUI(): void {
    if (logWrapper) {
        logWrapper.remove();
        logWrapper = null;
        logContainer = null;
    }
    activeRows.length = 0;
    pendingEntries.length = 0;
    rafScheduled = false;
    scrollRafScheduled = false;
    autoScroll = true;
}

// ============================================================
// INTERCEPTORS
// ============================================================

const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

function interceptConsole(): void {
    if (originals) return;

    originals = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug,
        fetch: window.fetch,
        xhrOpen: XMLHttpRequest.prototype.open,
        xhrSend: XMLHttpRequest.prototype.send,
        beacon: navigator.sendBeacon,
    };

    const queueFromArgs = (type: string, level: LogLevel, args: unknown[]) => {
        queueLog(type, level, args);
    };

    console.log = function (...args: unknown[]) {
        queueFromArgs('LOG', 'log', args);
        originals!.log.apply(console, args as any);
    };
    console.warn = function (...args: unknown[]) {
        queueFromArgs('WARN', 'warn', args);
        originals!.warn.apply(console, args as any);
    };
    console.error = function (...args: unknown[]) {
        queueFromArgs('ERROR', 'error', args);
        originals!.error.apply(console, args as any);
    };
    console.info = function (...args: unknown[]) {
        queueFromArgs('INFO', 'info', args);
        originals!.info.apply(console, args as any);
    };
    console.debug = function (...args: unknown[]) {
        queueFromArgs('DEBUG', 'log', args);
        originals!.debug.apply(console, args as any);
    };
}

function interceptErrors(): void {
    window.addEventListener('error', (e) => {
        queueLog('ERROR', 'error', [e.message, `${e.filename}:${e.lineno}`]);
    });
    window.addEventListener('unhandledrejection', (e) => {
        queueLog('ERROR', 'error', ['Unhandled Rejection:', e.reason]);
    });
}

function interceptXHR(): void {
    if (!originals || !originals.xhrOpen || !originals.xhrSend) return;

    const origOpen = originals.xhrOpen;
    const origSend = originals.xhrSend;

    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: any[]
    ) {
        xhrMeta.set(this, { method, url: String(url) });
        // @ts-expect-error passthrough
        return origOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: any) {
        const meta = xhrMeta.get(this);
        if (meta) {
            queueLog('XHR', 'info', [meta.method, meta.url]);
            this.addEventListener(
                'loadend',
                () => {
                    const level: LogLevel = this.status >= 400 ? 'error' : 'info';
                    queueLog('XHR', level, [
                        `${meta.method} ${meta.url} → ${this.status}`,
                    ]);
                },
                { once: true }
            );
        }
        return origSend.apply(this, [body]);
    };
}

function interceptFetch(): void {
    if (!originals || !originals.fetch) return;
    const origFetch = originals.fetch;

    window.fetch = function (
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> {
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                ? input.href
                : (input as Request).url;
        const method = init?.method || 'GET';
        queueLog('FETCH', 'info', [method, url]);

        return origFetch(input, init).then(
            (response) => {
                const level: LogLevel = response.ok ? 'info' : 'error';
                queueLog('FETCH', level, [method, url, '→', response.status]);
                return response;
            },
            (err) => {
                queueLog('FETCH', 'error', [method, url, 'ERROR', err]);
                throw err;
            }
        );
    } as typeof window.fetch;
}

function interceptBeacon(): void {
    if (!originals || !originals.beacon) return;
    const orig = originals.beacon;

    navigator.sendBeacon = function (
        url: string | URL,
        data?: any
    ): boolean {
        queueLog('BEACON', 'info', [String(url)]);
        return orig(url, data);
    } as typeof navigator.sendBeacon;
}

function restoreAll(): void {
    if (!originals) return;

    console.log = originals.log;
    console.warn = originals.warn;
    console.error = originals.error;
    console.info = originals.info;
    console.debug = originals.debug;

    if (originals.fetch) window.fetch = originals.fetch;
    if (originals.xhrOpen) XMLHttpRequest.prototype.open = originals.xhrOpen;
    if (originals.xhrSend) XMLHttpRequest.prototype.send = originals.xhrSend;
    if (originals.beacon) navigator.sendBeacon = originals.beacon;

    originals = null;
}

// ============================================================
// PUBLIC API
// ============================================================

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    createLogUI();
    queueLog('INFO', 'info', ['🟢 LogView active']);

    interceptConsole();
    interceptErrors();
    interceptXHR();
    interceptFetch();
    interceptBeacon();

    logger.info('📡 LogView enabled');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    restoreAll();
    teardownUI();

    logger.info('📡 LogView disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('logView');
    storage.setBoolean('logView', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function apply(): void {
    if (storage.getBoolean('logView')) {
        if (!isEnabled) enable();
    } else {
        if (isEnabled) disable();
    }
}

export function clearLogs(): void {
    if (logContainer) {
        logContainer.innerHTML = '';
        activeRows.length = 0;
    }
    pendingEntries.length = 0;
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (isEnabled) disable();
    });
}