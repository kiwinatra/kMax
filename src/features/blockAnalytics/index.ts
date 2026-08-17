// src/features/blockAnalytics.ts
import { logger } from '../../core/logger'
import { storage } from '../../core/storage';

let isBlocking = false;
let fakeDeviceId = '';
let fakeSessionId = '';
let fakeUserId = '';
let requestCounter = 0;

function generateFakeId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function isTracerKey(key: string): boolean {
    if (!key) return false;
    const lower = key.toLowerCase();
    return lower.includes('tracer') ||
           lower.includes('apptracer') ||
           lower.includes('device') ||
           lower.includes('session') ||
           lower.includes('user') ||
           lower.includes('id') ||
           lower.includes('uuid');
}

function isAppTracer(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('apptracer') || lower.includes('sdk-api.apptracer.ru');
}

function logFake(method: string, url: string, data: any): void {
    requestCounter++;
    console.group(`%c🔍 [#${requestCounter}] ${method} → ${url}`, 'color: #60a5fa; font-weight: bold;');
    console.log(`%c  Device: ${fakeDeviceId}`, 'color: #34d399;');
    console.log(`%c  Session: ${fakeSessionId}`, 'color: #34d399;');
    console.log(`%c  User: ${fakeUserId}`, 'color: #34d399;');
    if (data) {
        console.log('  Data:', data);
    }
    console.groupEnd();
}

export function enable(): void {
    if (isBlocking) return;
    isBlocking = true;

    fakeDeviceId = generateFakeId();
    fakeSessionId = generateFakeId();
    fakeUserId = generateFakeId();

    logger.info('🔥 ПОДМЕНА ID ТРЕКЕРА ВКЛЮЧЕНА');
    logger.debug(`📊 Device: ${fakeDeviceId}`);
    logger.debug(`📊 Session: ${fakeSessionId}`);
    logger.debug(`📊 User: ${fakeUserId}`);

    // ===== 1. ПЕРЕХВАТ XMLHttpRequest С ПОДАВЛЕНИЕМ ОШИБОК =====
    const origXHR = window.XMLHttpRequest;
    const xhr = function(this: any, ...args: any[]) {
        const instance = new (origXHR as any)(...args);
        let url = '';
        let isSync = false;
        let isBlockedRequest = false;

        const origOpen = instance.open;
        instance.open = function(method: string, u: string | URL, async: boolean = true, user?: string, password?: string) {
            url = typeof u === 'string' ? u : u.href;
            isSync = !async;
            isBlockedRequest = isAppTracer(url);
            
            if (isBlockedRequest) {
                logFake('XHR.open', url, { method, async, isSync });
            }
            origOpen.call(instance, method, u, async, user, password);
        };

        // ===== КЛЮЧЕВОЙ МОМЕНТ: ПЕРЕХВАТ responseType =====
        const origSetResponseType = Object.getOwnPropertyDescriptor(instance, 'responseType')?.set;
        if (origSetResponseType) {
            Object.defineProperty(instance, 'responseType', {
                set: function(value: string) {
                    if (isBlockedRequest && isSync) {
                        logger.debug(`🧹 responseType игнорирован: ${value} (sync request)`);
                        return;
                    }
                    origSetResponseType.call(this, value);
                },
                get: function() {
                    return this._responseType || '';
                },
                configurable: true
            });
        }

        // ===== КЛЮЧЕВОЙ МОМЕНТ: ПЕРЕХВАТ timeout =====
        const origSetTimeout = Object.getOwnPropertyDescriptor(instance, 'timeout')?.set;
        if (origSetTimeout) {
            Object.defineProperty(instance, 'timeout', {
                set: function(value: number) {
                    if (isBlockedRequest && isSync) {
                        logger.debug(`🧹 timeout игнорирован: ${value} (sync request)`);
                        return;
                    }
                    origSetTimeout.call(this, value);
                },
                get: function() {
                    return this._timeout || 0;
                },
                configurable: true
            });
        }

        const origSend = instance.send;
        instance.send = function(body?: any) {
            if (isBlockedRequest) {
                logFake('XHR.send', url, body);
            }
            origSend.call(instance, body);
        };

        const origSetHeader = instance.setRequestHeader;
        instance.setRequestHeader = function(header: string, value: string) {
            if (isBlockedRequest) {
                // Просто игнорируем
                return;
            }
            origSetHeader.call(instance, header, value);
        };

        return instance;
    };
    (window as any).XMLHttpRequest = xhr;
    (window as any).XMLHttpRequest.prototype = (origXHR as any).prototype;

    // ===== 2. ПЕРЕХВАТ localStorage =====
    const origGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = function(key: string): string | null {
        if (isTracerKey(key)) {
            const lower = key.toLowerCase();
            let result = null;
            if (lower.includes('device')) result = fakeDeviceId;
            else if (lower.includes('session')) result = fakeSessionId;
            else if (lower.includes('user')) result = fakeUserId;
            else result = generateFakeId();
            logger.debug(`🧹 getItem(${key}) → ${result}`);
            return result;
        }
        return origGetItem(key);
    };

    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key: string, value: string): void {
        if (isTracerKey(key)) {
            logger.debug(`🧹 Блокирована запись: ${key}=${value}`);
            return;
        }
        origSetItem(key, value);
    };

    const origRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function(key: string): void {
        if (isTracerKey(key)) {
            logger.debug(`🧹 Блокировано удаление: ${key}`);
            return;
        }
        origRemoveItem(key);
    };

    // ===== 3. ПЕРЕХВАТ cookies =====
    const origCookieGetter = Object.getOwnPropertyDescriptor(document, 'cookie')?.get;
    const origCookieSetter = Object.getOwnPropertyDescriptor(document, 'cookie')?.set;

    if (origCookieGetter && origCookieSetter) {
        Object.defineProperty(document, 'cookie', {
            get: function() {
                const cookies = origCookieGetter.call(document);
                if (typeof cookies === 'string') {
                    const filtered = cookies
                        .split(';')
                        .filter(c => {
                            const name = c.trim().split('=')[0] || '';
                            return !isTracerKey(name);
                        })
                        .join(';');
                    return filtered;
                }
                return cookies;
            },
            set: function(value: string) {
                const name = value.split('=')[0] || '';
                if (isTracerKey(name)) {
                    logger.debug(`🧹 Блокирована установка cookie: ${name}`);
                    return;
                }
                origCookieSetter.call(document, value);
            },
            configurable: true
        });
    }

    // ===== 4. ПЕРЕХВАТ FETCH =====
    const origFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input :
                   input instanceof URL ? input.href :
                   (input as any).url || '';
        if (isAppTracer(url)) {
            logFake('FETCH', url, init?.body);
        }
        return origFetch.call(this, input, init);
    };

    // ===== 5. ПЕРЕХВАТ BEACON =====
    const origSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url: string | URL, data?: any) {
        const urlStr = typeof url === 'string' ? url : url.href;
        if (isAppTracer(urlStr)) {
            logFake('BEACON', urlStr, data);
        }
        return origSendBeacon.call(this, url, data);
    };

    // ===== 6. ПЕРЕХВАТ ГЛОБАЛЬНЫХ ОБЪЕКТОВ =====
    const killList = [
        'TracerSDK2', 'tracerMain', 'instance',
        'Tracer', 'tracer', 'at', 'ot', 'ct',
        'mn', 'pte', 'Rte', 'vte', 'cne',
        'Pre', 'vme', 'Wz'
    ];

    for (const name of killList) {
        try {
            if (typeof (window as any)[name] !== 'undefined') {
                const orig = (window as any)[name];
                (window as any)[name] = function(...args: any[]) {
                    logger.debug(`🧹 Перехвачен вызов: ${name}`);
                    if (typeof orig === 'function') {
                        try {
                            const instance = new (orig as any)(...args);
                            if (instance) {
                                Object.defineProperty(instance, 'deviceId', { 
                                    value: fakeDeviceId, 
                                    writable: false,
                                    configurable: false 
                                });
                                Object.defineProperty(instance, 'sessionId', { 
                                    value: fakeSessionId, 
                                    writable: false,
                                    configurable: false 
                                });
                                Object.defineProperty(instance, 'userId', { 
                                    value: fakeUserId, 
                                    writable: false,
                                    configurable: false 
                                });
                            }
                            return instance;
                        } catch {
                            return { 
                                deviceId: fakeDeviceId,
                                sessionId: fakeSessionId,
                                userId: fakeUserId
                            };
                        }
                    }
                    return orig;
                };
                if (orig && typeof orig === 'function') {
                    Object.assign((window as any)[name], orig);
                }
            }
        } catch {}
    }

    // ===== 7. ПОДАВЛЯЕМ ОШИБКИ =====
    const origConsoleError = console.error;
    console.error = function(...args: any[]) {
        const str = args.map(String).join(' ');
        if (str.includes('tracer') || str.includes('apptracer') || 
            str.includes('Socket disconnected') || str.includes('setRequestHeader') ||
            str.includes('XMLHttpRequest') || str.includes('state must be OPENED') ||
            str.includes('responseType') || str.includes('synchronous')) {
            return;
        }
        origConsoleError.apply(console, args);
    };

    // ===== 8. ОЧИЩАЕМ СУЩЕСТВУЮЩИЕ ДАННЫЕ =====
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isTracerKey(key)) {
            localStorage.removeItem(key);
            logger.debug(`🧹 Удалён localStorage: ${key}`);
        }
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const name = cookie.trim().split('=')[0] || '';
        if (isTracerKey(name)) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            logger.debug(`🧹 Удалён cookie: ${name}`);
        }
    }

    logger.info('✅ ПОДМЕНА ID ВКЛЮЧЕНА');
    logger.info('🔒 Все ID трекера заменены на фейковые');
}

export function disable(): void {
    isBlocking = false;
    logger.info('✅ Подмена ID отключена (обнови страницу)');
}

export function toggle(): boolean {
    const current = storage.getBoolean('blockAnalytics');
    const newState = !current;
    storage.setBoolean('blockAnalytics', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}

export function isEnabled(): boolean {
    return isBlocking;
}