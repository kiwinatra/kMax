// src/features/logView/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { createElement, dom } from '../../core/dom';

// ============================================================
// КОНСТАНТЫ
// ============================================================

const MAX_LOGS = 150; // увеличено до 150
const BATCH_SIZE = 5;
const BATCH_DELAY = 100;
const MAX_STRING_LENGTH = 500; // обрезка длинных строк

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let isEnabled = false;
let logContainer: HTMLDivElement | null = null;
let logWrapper: HTMLDivElement | null = null;
let pendingLogs: { type: string; level: string; data: any }[] = [];
let batchTimeout: number | null = null;
let isProcessing = false;
let logCount = 0;

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Безопасное преобразование в строку (с обрезкой)
 */
function safeStringify(obj: any): string {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    if (typeof obj === 'function') return '[Function]';
    if (typeof obj === 'symbol') return obj.toString();
    if (obj instanceof Error) return `${obj.name}: ${obj.message}`;
    
    try {
        let str = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'function') return '[Function]';
            if (typeof value === 'symbol') return value.toString();
            if (value instanceof Error) return `${value.name}: ${value.message}`;
            return value;
        }, 2);
        
        // Обрезаем длинные строки
        if (str.length > MAX_STRING_LENGTH) {
            str = str.slice(0, MAX_STRING_LENGTH) + '... (truncated)';
        }
        return str;
    } catch {
        return String(obj);
    }
}

/**
 * Форматирование времени
 */
function formatTime(): string {
    const d = new Date();
    return d.toLocaleTimeString('ru-RU', { hour12: false }) + 
           '.' + String(d.getMilliseconds()).padStart(3, '0');
}

/**
 * Создание UI для логов
 */
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
    });

    // Скрываем скроллбар для WebKit
    logContainer.style.cssText += '::-webkit-scrollbar { display: none; }';

    logWrapper.appendChild(logContainer);
    document.body.appendChild(logWrapper);
}

/**
 * Добавление лога в UI (с батчингом)
 */
function addLogToUI(type: string, level: 'log' | 'info' | 'warn' | 'error', data: any): void {
    if (!isEnabled || !logContainer) return;
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Ограничиваем количество логов
        while (logContainer.children.length >= MAX_LOGS) {
            const first = logContainer.firstChild;
            if (first) logContainer.removeChild(first);
        }

        const colors: Record<string, string> = {
            log: '#b5bac1',
            info: '#3ba55c',
            warn: '#faa81a',
            error: '#ed4245',
        };

        const line = document.createElement('div');
        line.style.cssText = `
            display: flex;
            gap: 8px;
            font-size: 12px;
            line-height: 1.3;
            white-space: pre-wrap;
            word-break: break-word;
            opacity: 0.95;
            color: ${colors[level] || '#b5bac1'};
            max-width: 90vw;
            padding: 2px 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            animation: kmodLogFade 0.15s ease;
        `;

        // Время
        const timeSpan = document.createElement('span');
        timeSpan.textContent = formatTime();
        timeSpan.style.cssText = 'color: #888; flex-shrink: 0; min-width: 72px;';

        // Тип
        const typeSpan = document.createElement('span');
        typeSpan.textContent = type;
        typeSpan.style.cssText = `
            color: ${colors[level] || '#888'};
            font-weight: 600;
            flex-shrink: 0;
            min-width: 50px;
        `;

        // Сообщение
        const msgSpan = document.createElement('span');
        const text = typeof data === 'string' ? data : safeStringify(data);
        msgSpan.textContent = text;
        msgSpan.style.cssText = 'color: #f0f0f0; word-break: break-word;';

        line.appendChild(timeSpan);
        line.appendChild(typeSpan);
        line.appendChild(msgSpan);
        logContainer.appendChild(line);

        // Автоскролл
        if (logContainer.scrollTop >= logContainer.scrollHeight - logContainer.clientHeight - 20) {
            setTimeout(() => {
                if (logContainer) {
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            }, 10);
        }

        logCount++;
    } catch (e) {
        // Тихо
    } finally {
        isProcessing = false;
    }
}

/**
 * Пакетная обработка логов
 */
function flushLogs(): void {
    if (pendingLogs.length === 0) return;

    const logs = pendingLogs.splice(0, BATCH_SIZE);
    for (const log of logs) {
        addLogToUI(log.type, log.level as any, log.data);
    }

    if (pendingLogs.length > 0 && !batchTimeout) {
        batchTimeout = window.setTimeout(() => {
            batchTimeout = null;
            flushLogs();
        }, BATCH_DELAY);
    }
}

/**
 * Добавление лога в очередь
 */
function queueLog(type: string, level: 'log' | 'info' | 'warn' | 'error', data: any): void {
    if (!isEnabled) return;
    
    pendingLogs.push({ type, level, data });
    
    if (pendingLogs.length > BATCH_SIZE * 2) {
        flushLogs();
    } else if (!batchTimeout) {
        batchTimeout = window.setTimeout(() => {
            batchTimeout = null;
            flushLogs();
        }, BATCH_DELAY);
    }
}

// ============================================================
// ПЕРЕХВАТЫ
// ============================================================

let originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
} | null = null;

let originalFetch: typeof window.fetch | null = null;
let originalXHR: typeof XMLHttpRequest | null = null;

/**
 * Перехват console
 */
function interceptConsole(): void {
    if (originalConsole) return;

    originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
    };

    console.log = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
        queueLog('LOG', 'log', msg);
        originalConsole!.log(...args);
    };

    console.warn = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
        queueLog('WARN', 'warn', msg);
        originalConsole!.warn(...args);
    };

    console.error = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
        queueLog('ERROR', 'error', msg);
        originalConsole!.error(...args);
    };

    console.info = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' ');
        queueLog('INFO', 'info', msg);
        originalConsole!.info(...args);
    };
}

/**
 * Перехват ошибок
 */
function interceptErrors(): void {
    window.addEventListener('error', (e) => {
        queueLog('ERROR', 'error', `${e.message} at ${e.filename}:${e.lineno}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
        queueLog('ERROR', 'error', `Unhandled Rejection: ${safeStringify(e.reason)}`);
    });
}

/**
 * Перехват XHR
 */
function interceptXHR(): void {
    if (originalXHR) return;
    
    originalXHR = window.XMLHttpRequest;
    const XHR = originalXHR;

    window.XMLHttpRequest = function(this: any, ...args: any[]) {
        const instance = new (XHR as any)(...args);
        let url = '';
        let method = '';

        const origOpen = instance.open;
        instance.open = function(m: string, u: string | URL, async?: boolean, user?: string, password?: string) {
            url = typeof u === 'string' ? u : u.href;
            method = m;
            origOpen.call(instance, m, u, async !== false, user, password);
        };

        const origSend = instance.send;
        instance.send = function(body?: any) {
            queueLog('XHR', 'info', `${method} ${url}`);
            
            const origOnReadyStateChange = instance.onreadystatechange;
            instance.onreadystatechange = function(ev: Event) {
                if (instance.readyState === 4) {
                    const level = instance.status >= 400 ? 'error' : 'info';
                    queueLog('XHR', level, `${method} ${url} -> ${instance.status}`);
                }
                if (origOnReadyStateChange) origOnReadyStateChange.call(instance, ev);
            };

            return origSend.call(instance, body);
        };

        return instance;
    } as any;

    Object.assign(window.XMLHttpRequest, XHR);
    window.XMLHttpRequest.prototype = XHR.prototype;
}

/**
 * Перехват Fetch
 */
function interceptFetch(): void {
    if (originalFetch) return;
    
    originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : 
                   input instanceof URL ? input.href : 
                   (input as any).url || '';
        const method = init?.method || 'GET';
        queueLog('FETCH', 'info', `${method} ${url}`);

        return originalFetch!.call(this, input, init)
            .then((response) => {
                const level = response.ok ? 'info' : 'error';
                queueLog('FETCH', level, `${method} ${url} -> ${response.status}`);
                return response;
            })
            .catch((err) => {
                queueLog('FETCH', 'error', `${method} ${url} ERROR`);
                throw err;
            });
    };
}

// ============================================================
// ПУБЛИЧНЫЙ API
// ============================================================

/**
 * Включение LogView
 */
export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    createLogUI();
    queueLog('INFO', 'info', '🟢 LogView active');

    interceptConsole();
    interceptErrors();
    interceptXHR();
    interceptFetch();

    // Добавляем анимацию
    const style = document.createElement('style');
    style.id = 'kmod-logview-styles';
    style.textContent = `
        @keyframes kmodLogFade {
            from { opacity: 0; transform: translateX(10px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);

    logger.info('📡 LogView enabled');
}

/**
 * Отключение LogView
 */
export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    // Очищаем очередь
    if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
    }
    pendingLogs = [];

    // Восстанавливаем console
    if (originalConsole) {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        originalConsole = null;
    }

    // Восстанавливаем fetch
    if (originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
    }

    // Восстанавливаем XHR
    if (originalXHR) {
        window.XMLHttpRequest = originalXHR;
        originalXHR = null;
    }

    // Удаляем UI
    if (logWrapper) {
        logWrapper.remove();
        logWrapper = null;
        logContainer = null;
    }

    // Удаляем стили
    const styles = document.querySelector('#kmod-logview-styles');
    if (styles) styles.remove();

    logger.info('📡 LogView disabled');
}

/**
 * Переключение состояния
 */
export function toggle(): boolean {
    const current = storage.getBoolean('logView' as any);
    const newState = !current;
    storage.setBoolean('logView' as any, newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}

/**
 * Применение текущего состояния (для registry)
 */
export function apply(): void {
    const enabled = storage.getBoolean('logView' as any);
    if (enabled) {
        enable();
    } else {
        disable();
    }
}

/**
 * Очистка всех логов
 */
export function clearLogs(): void {
    if (logContainer) {
        logContainer.innerHTML = '';
        logCount = 0;
    }
}

// ============================================================
// ОЧИСТКА ПРИ ВЫГРУЗКЕ
// ============================================================

window.addEventListener('beforeunload', () => {
    if (isEnabled) {
        disable();
    }
});