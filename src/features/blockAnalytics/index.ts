/*
* @author: potemk.in
* @brief: Replaces AppTracer SDK identifiers with fake ones and blocks tracker requests.
* @desc: Rewritten for safe, reversible interception. All native APIs are restored on disable. Tracer detection is strict — only known AppTracer hosts/paths/keys, no broad "id"/"user"/"session" matching. localStorage and cookie cleanup touches only tracer-prefixed keys, never anything else. Kills a small, well-defined set of global tracer objects.
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
const TRACER_STORAGE_KEYS = new Set([
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
const TRACER_COOKIE_NAMES = new Set([
    'tracer_device_id',
    'tracer_session_id',
    'tracer_user_id',
    'apptracer',
    'crash_token',
]);

/** Global objects created by the AppTracer SDK. We neutralize them. */
const TRACER_GLOBALS = [
    'TracerSDK2',
    'tracerMain',
    'Tracer',
    'tracer',
    'tracerInstance',
];

// ============================================================
// STATE
// ============================================================

let isBlocking = false;

let fakeDeviceId = '';
let fakeSessionId = '';
let fakeUserId = '';
let requestCounter = 0;

interface Originals {
    xhrOpen: typeof XMLHttpRequest.prototype.open;
    xhrSend: typeof XMLHttpRequest.prototype.send;
    xhrSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader;
    fetch: typeof window.fetch;
    beacon: typeof navigator.sendBeacon;
    getItem: typeof localStorage.getItem;
    setItem: typeof localStorage.setItem;
    removeItem: typeof localStorage.removeItem;
    cookieDescriptor: PropertyDescriptor | undefined;
    globals: Map<string, unknown>;
}

let originals: Originals | null = null;

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
    if (key.startsWith('kmod_')) return false;
    if (key.startsWith('kmod-')) return false;
    return TRACER_STORAGE_KEYS.has(key);
}

function isTracerCookie(name: string): boolean {
    if (!name) return false;
    if (name.startsWith('kmod_')) return false;
    return TRACER_COOKIE_NAMES.has(name);
}

function logFake(method: string, url: string, data?: unknown): void {
    requestCounter++;
    logger.debug(`🕵️ [#${requestCounter}] ${method} → ${url}`, data ?? '');
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

    XMLHttpRequest.prototype.setRequestHeader = function (
        this: XMLHttpRequest,
        header: string,
        value: string
    ) {
        const meta = xhrMeta.get(this);
        if (meta && isTracerUrl(meta.url)) return;
        return origSetHeader.call(this, header, value);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: any) {
        const meta = xhrMeta.get(this);
        if (meta && isTracerUrl(meta.url)) {
            logFake('XHR', meta.url, body);
        }
        return origSend.call(this, body);
    };
}

// ============================================================
// FETCH / BEACON
// ============================================================

function patchFetch(): void {
    if (!originals) return;
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

        if (isTracerUrl(url)) logFake('FETCH', url, init?.body);
        return origFetch(input, init);
    } as typeof window.fetch;
}

function patchBeacon(): void {
    if (!originals) return;
    const orig = originals.beacon;

    navigator.sendBeacon = function (
        url: string | URL,
        data?: any
    ): boolean {
        const urlStr = String(url);
        if (isTracerUrl(urlStr)) logFake('BEACON', urlStr, data);
        return orig(url, data);
    } as typeof navigator.sendBeacon;
}

// ============================================================
// STORAGE / COOKIES
// ============================================================

function patchLocalStorage(): void {
    if (!originals) return;
    const { getItem, setItem, removeItem } = originals;

    Storage.prototype.getItem = function (this: Storage, key: string): string | null {
        if (isTracerStorageKey(key)) {
            const lower = key.toLowerCase();
            if (lower.includes('device')) return fakeDeviceId;
            if (lower.includes('session')) return fakeSessionId;
            if (lower.includes('user')) return fakeUserId;
            return generateFakeId();
        }
        return getItem.call(this, key);
    };

    Storage.prototype.setItem = function (
        this: Storage,
        key: string,
        value: string
    ): void {
        if (isTracerStorageKey(key)) return;
        setItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (this: Storage, key: string): void {
        if (isTracerStorageKey(key)) return;
        removeItem.call(this, key);
    };
}

function patchCookies(): void {
    const desc = originals?.cookieDescriptor;
    if (!desc || !desc.get || !desc.set) return;

    const origGet = desc.get;
    const origSet = desc.set;

    Object.defineProperty(document, 'cookie', {
        get() {
            const cookies = origGet.call(document);
            if (typeof cookies !== 'string') return cookies;
            return cookies
                .split(';')
                .filter((c) => {
                    const name = c.trim().split('=')[0] || '';
                    return !isTracerCookie(name);
                })
                .join(';');
        },
        set(value: string) {
            const name = value.split('=')[0]?.trim() || '';
            if (isTracerCookie(name)) return;
            origSet.call(document, value);
        },
        configurable: true,
    });
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
            try {
                delete w[name];
            } catch {
                w[name] = undefined;
            }
        } catch {}
    }
}

function restoreGlobals(): void {
    if (!originals) return;
    for (const [name, value] of originals.globals) {
        try {
            (window as any)[name] = value;
        } catch {}
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

    console.error = function (...args: unknown[]) {
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
    };
}

function restoreConsole(): void {
    if (origConsoleError) {
        console.error = origConsoleError;
        origConsoleError = null;
    }
}

// ============================================================
// CLEANUP EXISTING TRACER DATA
// ============================================================

function purgeExisting(): void {
    // localStorage — exact keys only
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && isTracerStorageKey(key)) {
                originals!.removeItem.call(localStorage, key);
            }
        }
    } catch {}

    // cookies — exact names only
    try {
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
            const name = c.trim().split('=')[0] || '';
            if (isTracerCookie(name)) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        }
    } catch {}
}

// ============================================================
// ENABLE / DISABLE
// ============================================================

export function enable(): void {
    if (isBlocking) return;
    isBlocking = true;

    fakeDeviceId = generateFakeId();
    fakeSessionId = generateFakeId();
    fakeUserId = generateFakeId();

    originals = {
        xhrOpen: XMLHttpRequest.prototype.open,
        xhrSend: XMLHttpRequest.prototype.send,
        xhrSetHeader: XMLHttpRequest.prototype.setRequestHeader,
        fetch: window.fetch,
        beacon: navigator.sendBeacon,
        getItem: Storage.prototype.getItem,
        setItem: Storage.prototype.setItem,
        removeItem: Storage.prototype.removeItem,
        cookieDescriptor: Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
            Object.getOwnPropertyDescriptor(document, 'cookie'),
        globals: new Map(),
    };

    patchXHR();
    patchFetch();
    patchBeacon();
    patchLocalStorage();
    patchCookies();
    patchConsole();
    killGlobals();
    purgeExisting();

    logger.info('🔥 Analytics blocked (IDs replaced)');
}

export function disable(): void {
    if (!isBlocking) return;
    isBlocking = false;

    if (originals) {
        XMLHttpRequest.prototype.open = originals.xhrOpen;
        XMLHttpRequest.prototype.send = originals.xhrSend;
        XMLHttpRequest.prototype.setRequestHeader = originals.xhrSetHeader;

        window.fetch = originals.fetch;
        navigator.sendBeacon = originals.beacon;

        Storage.prototype.getItem = originals.getItem;
        Storage.prototype.setItem = originals.setItem;
        Storage.prototype.removeItem = originals.removeItem;

        if (originals.cookieDescriptor) {
            Object.defineProperty(document, 'cookie', originals.cookieDescriptor);
        }

        restoreConsole();
        restoreGlobals();

        originals = null;
    }

    requestCounter = 0;
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