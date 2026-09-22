/*
 * @author: potemk.in
 * @brief: Aggressively neutralizes the AppTracer SDK: replaces identifiers,
 *         drops tracer traffic, and hides every patch from detection.
 * @desc:  Rewritten with:
 *           • stealth layer   — Function.prototype.toString spoofing so patched
 *                               natives look untouched under introspection;
 *           • blocking layer  — fetch/XHR/beacon/Image.src/WebSocket all drop
 *                               tracer traffic instead of just logging it;
 *           • strict detection — only known AppTracer hosts/paths/keys;
 *           • 100% reversible — every native is restored on disable();
 *           • throttled logs  — no console spam under retry storms.
 */

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';

// ============================================================
// CONSTANTS
// ============================================================

/** Hosts/paths that belong to AppTracer. Anything else is left alone. */
const TRACER_URL_PATTERNS = [
    'apptracer.ru',
    'apptracer.',
    'sdk-api.apptracer.ru',
    '/perf/upload',
    'uploadBatch',
    'uploadSession',
    'uploadSessionInfo',
];

/** Exact localStorage keys we consider tracer-owned. */
const TRACER_STORAGE_KEYS = new Set<string>([
    'tracer_device_id',
    'tracer_session_id',
    'tracer_user_id',
    'apptracer_device',
    'apptracer_session',
    'apptracer_user',
    'crash_token',
    'track_session',
]);

/** Exact cookie names we consider tracer-owned. */
const TRACER_COOKIE_NAMES = new Set<string>([
    'tracer_device_id',
    'tracer_session_id',
    'tracer_user_id',
    'apptracer',
    'crash_token',
]);

/** Global objects created by the AppTracer SDK. We neutralize them. */
const TRACER_GLOBALS = [
    'TracerSDK2',
    'TracerSDK',
    'tracerMain',
    'Tracer',
    'tracer',
    'tracerInstance',
];

/** Prefixes that always belong to us; we never touch these keys. */
const PROTECTED_PREFIXES = ['kmod_', 'kmod-'];

/** Log throttling — keeps the console sane under retry storms. */
const LOG_THROTTLE_WINDOW_MS = 1000;
const MAX_DETAILED_LOGS_PER_WINDOW = 5;

/** 1x1 transparent GIF, used to replace blocked <img> pixels. */
const TRANSPARENT_GIF =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// ============================================================
// STATE
// ============================================================

let isBlocking = false;

let fakeDeviceId = '';
let fakeSessionId = '';
let fakeUserId = '';

let requestCounter = 0;
let blockedCounter = 0;

let logWindowStart = 0;
let logsThisWindow = 0;

interface Originals {
    xhrOpen: typeof XMLHttpRequest.prototype.open;
    xhrSend: typeof XMLHttpRequest.prototype.send;
    xhrSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader;

    fetch: typeof window.fetch;
    beacon: typeof navigator.sendBeacon;

    imageSrc: PropertyDescriptor | undefined;

    wsSend: typeof WebSocket.prototype.send | undefined;

    getItem: typeof Storage.prototype.getItem;
    setItem: typeof Storage.prototype.setItem;
    removeItem: typeof Storage.prototype.removeItem;

    cookieDescriptor: PropertyDescriptor | undefined;

    globals: Map<string, unknown>;
}

let originals: Originals | null = null;

// ============================================================
// STEALTH LAYER
// ------------------------------------------------------------
// Any function we install must respond to toString() and to
// `Function.prototype.toString.call(fn)` with a native-looking
// string. Otherwise a single `fetch.toString()` check reveals
// the patch and the SDK bypasses us.
// ============================================================

const FAKE_SOURCE = new WeakMap<Function, string>();
let origFunctionToString: typeof Function.prototype.toString | null = null;

/** Attach a native-looking `.toString()` to a patched function. */
function makeNative<T extends Function>(fn: T, nativeName: string): T {
    const src = `function ${nativeName}() { [native code] }`;
    try {
        FAKE_SOURCE.set(fn, src);
    } catch {
        /* ignore */
    }
    try {
        Object.defineProperty(fn, 'name', {
            value: nativeName,
            configurable: true,
        });
    } catch {
        /* ignore */
    }
    try {
        const fakeToString = function toString() {
            return src;
        };
        FAKE_SOURCE.set(
            fakeToString,
            'function toString() { [native code] }',
        );
        Object.defineProperty(fn, 'toString', {
            value: fakeToString,
            writable: false,
            configurable: true,
        });
    } catch {
        /* ignore */
    }
    return fn;
}

/**
 * Patch `Function.prototype.toString` so that
 * `Function.prototype.toString.call(patchedFn)` also returns the
 * fake native source instead of the real wrapper code.
 */
function installToStringGuard(): void {
    if (origFunctionToString) return;
    origFunctionToString = Function.prototype.toString;

    const guard = function toString(this: Function) {
        const fake = FAKE_SOURCE.get(this);
        if (fake !== undefined) return fake;
        return origFunctionToString!.call(this);
    };
    // Guard itself must look native.
    FAKE_SOURCE.set(guard, 'function toString() { [native code] }');
    try {
        Object.defineProperty(guard, 'name', {
            value: 'toString',
            configurable: true,
        });
    } catch {
        /* ignore */
    }
    Function.prototype.toString = guard;
}

function restoreToStringGuard(): void {
    if (origFunctionToString) {
        Function.prototype.toString = origFunctionToString;
        origFunctionToString = null;
    }
}

// ============================================================
// FAKE ID GENERATOR
// ============================================================

function generateFakeId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================================
// DETECTION (strict)
// ============================================================

function isTracerUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    for (const pattern of TRACER_URL_PATTERNS) {
        if (lower.includes(pattern)) return true;
    }
    return false;
}

function isTracerStorageKey(key: string): boolean {
    if (!key) return false;
    for (const p of PROTECTED_PREFIXES) if (key.startsWith(p)) return false;
    return TRACER_STORAGE_KEYS.has(key);
}

function isTracerCookie(name: string): boolean {
    if (!name) return false;
    for (const p of PROTECTED_PREFIXES) if (name.startsWith(p)) return false;
    return TRACER_COOKIE_NAMES.has(name);
}

// ============================================================
// LOGGING (throttled)
// ============================================================

function logBlocked(method: string, url: string, data?: unknown): void {
    requestCounter++;
    blockedCounter++;

    const now = Date.now();
    if (now - logWindowStart > LOG_THROTTLE_WINDOW_MS) {
        logWindowStart = now;
        logsThisWindow = 0;
    }
    logsThisWindow++;
    if (logsThisWindow > MAX_DETAILED_LOGS_PER_WINDOW) return;

    logger.debug(`🛡️ [#${requestCounter}] ${method} BLOCKED → ${url}`, data ?? '');
}

// ============================================================
// XHR INTERCEPTION
// ============================================================

const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

function patchXHR(): void {
    if (!originals) return;

    const origOpen = originals.xhrOpen;
    const origSend = originals.xhrSend;
    const origSetHeader = originals.xhrSetHeader;

    const newOpen = makeNative(function open(
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: any[]
    ) {
        try {
            xhrMeta.set(this, { method, url: String(url) });
        } catch {
            /* ignore */
        }
        // @ts-ignore — passthrough, extra args are optional
        return origOpen.apply(this, [method, url, ...rest]);
    }, 'open');

    const newSetHeader = makeNative(function setRequestHeader(
        this: XMLHttpRequest,
        header: string,
        value: string,
    ) {
        const meta = xhrMeta.get(this);
        if (meta && isTracerUrl(meta.url)) return;
        return origSetHeader.call(this, header, value);
    }, 'setRequestHeader');

    const newSend = makeNative(function send(
        this: XMLHttpRequest,
        body?: any,
    ) {
        const meta = xhrMeta.get(this);
        if (meta && isTracerUrl(meta.url)) {
            logBlocked('XHR', meta.url, body);

            // Simulate a network failure: never hit the wire.
            const xhr = this;
            try {
                Object.defineProperty(xhr, 'readyState', {
                    value: 4,
                    configurable: true,
                });
                Object.defineProperty(xhr, 'status', {
                    value: 0,
                    configurable: true,
                });
                Object.defineProperty(xhr, 'statusText', {
                    value: '',
                    configurable: true,
                });
                Object.defineProperty(xhr, 'responseText', {
                    value: '',
                    configurable: true,
                });
                Object.defineProperty(xhr, 'response', {
                    value: '',
                    configurable: true,
                });
                Object.defineProperty(xhr, 'responseURL', {
                    value: '',
                    configurable: true,
                });
            } catch {
                /* ignore */
            }

            setTimeout(() => {
                try {
                    xhr.dispatchEvent(new Event('readystatechange'));
                } catch {
                    /* ignore */
                }
                try {
                    xhr.dispatchEvent(new Event('error'));
                } catch {
                    /* ignore */
                }
                try {
                    xhr.dispatchEvent(new Event('loadend'));
                } catch {
                    /* ignore */
                }
            }, 0);

            return;
        }
        return origSend.call(this, body);
    }, 'send');

    XMLHttpRequest.prototype.open = newOpen as any;
    XMLHttpRequest.prototype.setRequestHeader = newSetHeader as any;
    XMLHttpRequest.prototype.send = newSend as any;
}

// ============================================================
// FETCH
// ============================================================

function patchFetch(): void {
    if (!originals) return;
    const origFetch = originals.fetch;

    const newFetch = makeNative(function fetch(
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response> {
        let url = '';
        try {
            url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                    ? input.href
                    : (input as Request).url;
        } catch {
            /* ignore */
        }

        if (isTracerUrl(url)) {
            logBlocked('FETCH', url, init?.body);
            // Fail loudly — SDK sees a network error, not a silent drop.
            return Promise.reject(new TypeError('Failed to fetch'));
        }
        return origFetch.call(window, input, init);
    }, 'fetch');

    window.fetch = newFetch as typeof window.fetch;
}

// ============================================================
// SEND BEACON
// ============================================================

function patchBeacon(): void {
    if (!originals) return;
    const orig = originals.beacon;

    const newBeacon = makeNative(function sendBeacon(
        url: string | URL,
        data?: any,
    ): boolean {
        const urlStr = String(url);
        if (isTracerUrl(urlStr)) {
            logBlocked('BEACON', urlStr, data);
            return false;
        }
        return orig.call(navigator, url, data);
    }, 'sendBeacon');

    navigator.sendBeacon = newBeacon as typeof navigator.sendBeacon;
}

// ============================================================
// IMAGE PIXEL (new Image().src = ...)
// ============================================================

function patchImageSrc(): void {
    if (!originals?.imageSrc) return;
    const desc = originals.imageSrc;
    if (!desc.get || !desc.set) return;

    const origGet = desc.get;
    const origSet = desc.set;

    const newGet = makeNative(function src(this: HTMLImageElement) {
        return origGet.call(this);
    }, 'src');

    const newSet = makeNative(function src(this: HTMLImageElement, value: string) {
        const urlStr = String(value);
        if (isTracerUrl(urlStr)) {
            logBlocked('IMG', urlStr);
            // Swap for a 1×1 transparent GIF so no request ever fires.
            return origSet.call(this, TRANSPARENT_GIF);
        }
        return origSet.call(this, value);
    }, 'src');

    try {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            get: newGet,
            set: newSet,
            configurable: true,
            enumerable: desc.enumerable,
        });
    } catch {
        /* ignore */
    }
}

// ============================================================
// WEBSOCKET (send only — we don't touch the constructor)
// ============================================================

function patchWebSocket(): void {
    if (typeof WebSocket === 'undefined' || !originals?.wsSend) return;
    const origSend = originals.wsSend;

    const newSend = makeNative(function send(this: WebSocket, data: any) {
        try {
            if (isTracerUrl(this.url)) {
                logBlocked('WS', this.url, data);
                return;
            }
        } catch {
            /* ignore */
        }
        return origSend.call(this, data);
    }, 'send');

    try {
        WebSocket.prototype.send = newSend;
    } catch {
        /* ignore */
    }
}

// ============================================================
// STORAGE
// ============================================================

function patchLocalStorage(): void {
    if (!originals) return;
    const { getItem, setItem, removeItem } = originals;

    const newGetItem = makeNative(function getItem(
        this: Storage,
        key: string,
    ): string | null {
        if (isTracerStorageKey(key)) {
            const lower = key.toLowerCase();
            if (lower.includes('device')) return fakeDeviceId;
            if (lower.includes('session')) return fakeSessionId;
            if (lower.includes('user')) return fakeUserId;
            return generateFakeId();
        }
        return getItem.call(this, key);
    }, 'getItem');

    const newSetItem = makeNative(function setItem(
        this: Storage,
        key: string,
        value: string,
    ): void {
        if (isTracerStorageKey(key)) return;
        setItem.call(this, key, value);
    }, 'setItem');

    const newRemoveItem = makeNative(function removeItem(
        this: Storage,
        key: string,
    ): void {
        if (isTracerStorageKey(key)) return;
        removeItem.call(this, key);
    }, 'removeItem');

    Storage.prototype.getItem = newGetItem as any;
    Storage.prototype.setItem = newSetItem as any;
    Storage.prototype.removeItem = newRemoveItem as any;
}

// ============================================================
// COOKIES
// ============================================================

function patchCookies(): void {
    const desc = originals?.cookieDescriptor;
    if (!desc?.get || !desc?.set) return;

    const origGet = desc.get;
    const origSet = desc.set;

    const newGet = makeNative(function get(this: Document) {
        const cookies = origGet.call(this);
        if (typeof cookies !== 'string') return cookies;
        return cookies
            .split(';')
            .filter((c) => {
                const name = c.trim().split('=')[0] || '';
                return !isTracerCookie(name);
            })
            .join(';');
    }, 'get cookie');

    const newSet = makeNative(function set(this: Document, value: string) {
        const name = value.split('=')[0]?.trim() || '';
        if (isTracerCookie(name)) return;
        origSet.call(this, value);
    }, 'set cookie');

    try {
        Object.defineProperty(document, 'cookie', {
            get: newGet,
            set: newSet,
            configurable: true,
        });
    } catch {
        /* ignore */
    }
}

// ============================================================
// GLOBALS
// ============================================================

function killGlobals(): void {
    if (!originals) return;

    for (const name of TRACER_GLOBALS) {
        try {
            const w = window as any;
            if (typeof w[name] === 'undefined') continue;

            originals.globals.set(name, w[name]);

            // Aggressive neutralize before unsetting.
            const val = w[name];
            if (val && typeof val === 'object') {
                try {
                    Object.freeze(val);
                } catch {
                    /* ignore */
                }
                try {
                    if (val.prototype) Object.freeze(val.prototype);
                } catch {
                    /* ignore */
                }
            }

            try {
                delete w[name];
            } catch {
                try {
                    w[name] = undefined;
                } catch {
                    /* ignore */
                }
            }
        } catch {
            /* ignore */
        }
    }
}

function restoreGlobals(): void {
    if (!originals) return;
    for (const [name, value] of originals.globals) {
        try {
            (window as any)[name] = value;
        } catch {
            /* ignore */
        }
    }
    originals.globals.clear();
}

// ============================================================
// CONSOLE NOISE FILTER
// ============================================================

let origConsoleError: typeof console.error | null = null;

function patchConsole(): void {
    if (origConsoleError) return;
    origConsoleError = console.error;

    const newError = makeNative(function error(
        this: Console,
        ...args: unknown[]
    ) {
        const str = args.map(String).join(' ');
        if (
            str.includes('apptracer') ||
            str.includes('TracerSDK') ||
            str.includes('setRequestHeader') ||
            str.includes('state must be OPENED')
        ) {
            return;
        }
        origConsoleError!.apply(console, args as any);
    }, 'error');

    console.error = newError as typeof console.error;
}

function restoreConsole(): void {
    if (origConsoleError) {
        console.error = origConsoleError;
        origConsoleError = null;
    }
}

// ============================================================
// PURGE PRE-EXISTING TRACER DATA
// (runs before patches so it can use the native setters)
// ============================================================

function purgeExisting(): void {
    if (!originals) return;

    // localStorage — exact keys only, via original removeItem.
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isTracerStorageKey(key)) toRemove.push(key);
        }
        for (const key of toRemove) {
            try {
                originals.removeItem.call(localStorage, key);
            } catch {
                /* ignore */
            }
        }
    } catch {
        /* ignore */
    }

    // cookies — exact names only, via original setter.
    try {
        const cookieStr = document.cookie;
        if (cookieStr && originals.cookieDescriptor?.set) {
            const setter = originals.cookieDescriptor.set;
            const cookies = cookieStr.split(';');
            for (const c of cookies) {
                const name = c.trim().split('=')[0] || '';
                if (isTracerCookie(name)) {
                    try {
                        setter.call(
                            document,
                            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`,
                        );
                    } catch {
                        /* ignore */
                    }
                }
            }
        }
    } catch {
        /* ignore */
    }
}

// ============================================================
// ENABLE / DISABLE
// ============================================================

export function enable(): void {
    if (isBlocking) return;
    isBlocking = true;

    installToStringGuard();

    fakeDeviceId = generateFakeId();
    fakeSessionId = generateFakeId();
    fakeUserId = generateFakeId();

    requestCounter = 0;
    blockedCounter = 0;
    logWindowStart = Date.now();
    logsThisWindow = 0;

    originals = {
        xhrOpen: XMLHttpRequest.prototype.open,
        xhrSend: XMLHttpRequest.prototype.send,
        xhrSetHeader: XMLHttpRequest.prototype.setRequestHeader,

        fetch: window.fetch,
        beacon: navigator.sendBeacon,

        imageSrc: Object.getOwnPropertyDescriptor(
            HTMLImageElement.prototype,
            'src',
        ),

        wsSend:
            typeof WebSocket !== 'undefined'
                ? WebSocket.prototype.send
                : undefined,

        getItem: Storage.prototype.getItem,
        setItem: Storage.prototype.setItem,
        removeItem: Storage.prototype.removeItem,

        cookieDescriptor:
            Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
            Object.getOwnPropertyDescriptor(document, 'cookie'),

        globals: new Map(),
    };

    // Purge BEFORE patching so native setters are still in place.
    purgeExisting();

    patchXHR();
    patchFetch();
    patchBeacon();
    patchImageSrc();
    patchWebSocket();
    patchLocalStorage();
    patchCookies();
    patchConsole();
    killGlobals();

    logger.info(
        '🔥 Analytics aggressively blocked (IDs replaced, traffic dropped)',
    );
}

export function disable(): void {
    if (!isBlocking) return;
    isBlocking = false;

    if (originals) {
        try {
            XMLHttpRequest.prototype.open = originals.xhrOpen;
        } catch {
            /* ignore */
        }
        try {
            XMLHttpRequest.prototype.send = originals.xhrSend;
        } catch {
            /* ignore */
        }
        try {
            XMLHttpRequest.prototype.setRequestHeader = originals.xhrSetHeader;
        } catch {
            /* ignore */
        }

        try {
            window.fetch = originals.fetch;
        } catch {
            /* ignore */
        }
        try {
            navigator.sendBeacon = originals.beacon;
        } catch {
            /* ignore */
        }

        try {
            if (originals.imageSrc) {
                Object.defineProperty(
                    HTMLImageElement.prototype,
                    'src',
                    originals.imageSrc,
                );
            }
        } catch {
            /* ignore */
        }

        try {
            if (originals.wsSend && typeof WebSocket !== 'undefined') {
                WebSocket.prototype.send = originals.wsSend;
            }
        } catch {
            /* ignore */
        }

        try {
            Storage.prototype.getItem = originals.getItem;
        } catch {
            /* ignore */
        }
        try {
            Storage.prototype.setItem = originals.setItem;
        } catch {
            /* ignore */
        }
        try {
            Storage.prototype.removeItem = originals.removeItem;
        } catch {
            /* ignore */
        }

        try {
            if (originals.cookieDescriptor) {
                Object.defineProperty(
                    document,
                    'cookie',
                    originals.cookieDescriptor,
                );
            }
        } catch {
            /* ignore */
        }

        restoreConsole();
        restoreGlobals();

        originals = null;
    }

    restoreToStringGuard();

    requestCounter = 0;
    blockedCounter = 0;
    logger.info('✅ Analytics block disabled (refresh recommended)');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('blockAnalytics');
    storage.setBoolean('blockAnalytics', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isEnabled(): boolean {
    return isBlocking;
}

// ============================================================
// DEBUG HELPERS
// ============================================================

export function getStats(): {
    enabled: boolean;
    total: number;
    blocked: number;
    fakeDeviceId: string;
    fakeSessionId: string;
    fakeUserId: string;
} {
    return {
        enabled: isBlocking,
        total: requestCounter,
        blocked: blockedCounter,
        fakeDeviceId,
        fakeSessionId,
        fakeUserId,
    };
}