/*
 * @author: potemk.in
 * @brief: Replaces AppTracer SDK identifiers with fake ones. Requests pass
 *         through with fake bodies; SDK sees success; host app never
 *         notices a network failure; storage of the host app is untouched.
 * @desc:  v5 — critical fixes:
 *           • Beacon/fetch use caller's `this` (Firefox Xray).
 *           • Storage layer removed entirely — replaced with a
 *             MutationObserver + interval cleaner that only touches
 *             `tracer-device-id` / `tracer-mute-*` / `__ls_tracer_test`.
 *             Host app (MAX) and kMax-Mod never see our patches.
 *           • Every Storage patch from previous versions is gone.
 *             This is what was logging the user out.
 *           • Keeps: URL detection, body rewrite, stealth toString,
 *             Image.src, WebSocket.send, globals kill, cookie shadow.
 */

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';

// ============================================================
// CONFIG
// ============================================================

const TRACER_URL_PATTERNS = [
    'apptracer.ru',
    'apptracer.',
    'sdk-api.apptracer.ru',
    '/perf/upload',
    '/api/crash/trackSession',
    '/api/crash/uploadBatch',
    'uploadBatch',
    'uploadSession',
    'uploadSessionInfo',
    'trackSession',
];

/** Real tracer keys (hyphens, from bundled SDK). */
const TRACER_STORAGE_KEYS_EXACT = new Set<string>([
    'tracer-device-id',
    'apptracer_device',
    'apptracer_session',
    'apptracer_user',
]);

/** Real dynamic prefix used by SDK. */
const TRACER_STORAGE_PREFIX = 'tracer-mute-';

/** Probe the SDK uses to decide whether native LS is usable. */
const SDK_STORAGE_PROBE = '__ls_tracer_test';

const TRACER_COOKIE_NAMES = new Set<string>([
    'tracer-device-id',
    'apptracer',
]);

const TRACER_GLOBALS = [
    'TracerSDK2',
    'TracerSDK',
    'tracerMain',
    'Tracer',
    'tracer',
    'tracerInstance',
];

const PROTECTED_PREFIXES = ['kmod_', 'kmod-'];

const TRANSPARENT_GIF =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const ID_KEYS_IN_BODY = ['sessionUuid', 'deviceId', 'sessionId', 'userId'];

// ============================================================
// STATE
// ============================================================

let isBlocking = false;

let fakeDeviceId = '';
let fakeSessionId = '';
let fakeUserId = '';

let requestCounter = 0;
let blockedCounter = 0;

interface Originals {
    xhrOpen: typeof XMLHttpRequest.prototype.open;
    xhrSend: typeof XMLHttpRequest.prototype.send;
    xhrSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader;

    fetch: typeof window.fetch;
    beacon: typeof navigator.sendBeacon;

    imageSrc: PropertyDescriptor | undefined;
    wsSend: typeof WebSocket.prototype.send | undefined;

    cookieDescriptor: PropertyDescriptor | undefined;

    globals: Map<string, unknown>;
}

let originals: Originals | null = null;

/** Storage cleaner teardown. */
let storageCleanerStop: (() => void) | null = null;

// ============================================================
// STEALTH
// ============================================================

const FAKE_SOURCE = new WeakMap<Function, string>();
let origFunctionToString: typeof Function.prototype.toString | null = null;

function makeNative<T extends Function>(fn: T, nativeName: string): T {
    const src = `function ${nativeName}() { [native code] }`;
    try { FAKE_SOURCE.set(fn, src); } catch { /* ignore */ }
    try {
        Object.defineProperty(fn, 'name', { value: nativeName, configurable: true });
    } catch { /* ignore */ }
    try {
        const fakeToString = function toString() { return src; };
        FAKE_SOURCE.set(fakeToString, 'function toString() { [native code] }');
        Object.defineProperty(fn, 'toString', {
            value: fakeToString,
            writable: false,
            configurable: true,
        });
    } catch { /* ignore */ }
    return fn;
}

function installToStringGuard(): void {
    if (origFunctionToString) return;
    origFunctionToString = Function.prototype.toString;
    const guard = function toString(this: Function) {
        const fake = FAKE_SOURCE.get(this);
        if (fake !== undefined) return fake;
        return origFunctionToString!.call(this);
    };
    FAKE_SOURCE.set(guard, 'function toString() { [native code] }');
    try {
        Object.defineProperty(guard, 'name', { value: 'toString', configurable: true });
    } catch { /* ignore */ }
    Function.prototype.toString = guard;
}

function restoreToStringGuard(): void {
    if (origFunctionToString) {
        Function.prototype.toString = origFunctionToString;
        origFunctionToString = null;
    }
}

// ============================================================
// FAKE ID
// ============================================================

function generateFakeId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================================
// DETECTION
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
    if (key.startsWith(TRACER_STORAGE_PREFIX)) return true;
    if (key === SDK_STORAGE_PROBE) return true;
    return TRACER_STORAGE_KEYS_EXACT.has(key);
}

function isTracerCookie(name: string): boolean {
    if (!name) return false;
    for (const p of PROTECTED_PREFIXES) if (name.startsWith(p)) return false;
    return TRACER_COOKIE_NAMES.has(name);
}

// ============================================================
// BODY REWRITE (generic to keep TS happy at call-sites)
// ============================================================

function rewriteTracerBody<T>(body: T): T {
    if (typeof body !== 'string' || body.length === 0 || body[0] !== '{') return body;
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { return body; }
    if (!parsed || typeof parsed !== 'object') return body;

    let changed = false;

    for (const k of ID_KEYS_IN_BODY) {
        if (typeof parsed[k] === 'string' && parsed[k].length > 0) {
            if (k === 'sessionUuid' || k === 'sessionId') parsed[k] = fakeSessionId;
            else if (k === 'deviceId')                    parsed[k] = fakeDeviceId;
            else if (k === 'userId')                      parsed[k] = fakeUserId;
            changed = true;
        }
    }

    if (Array.isArray(parsed.sessions)) {
        for (const s of parsed.sessions) {
            if (s && typeof s === 'object') {
                if (typeof s.sessionUuid === 'string') { s.sessionUuid = fakeSessionId; changed = true; }
                if (typeof s.deviceId === 'string')    { s.deviceId = fakeDeviceId;    changed = true; }
            }
        }
    }

    if (Array.isArray(parsed.samples)) {
        for (const s of parsed.samples) {
            if (s && typeof s === 'object' && s.attributes && typeof s.attributes === 'object') {
                for (const k of ID_KEYS_IN_BODY) {
                    if (typeof s.attributes[k] === 'string') {
                        if (k === 'sessionUuid' || k === 'sessionId') s.attributes[k] = fakeSessionId;
                        else if (k === 'deviceId')                    s.attributes[k] = fakeDeviceId;
                        else if (k === 'userId')                      s.attributes[k] = fakeUserId;
                        changed = true;
                    }
                }
            }
        }
    }

    return (changed ? JSON.stringify(parsed) : body) as T;
}

// ============================================================
// XHR
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
        try { xhrMeta.set(this, { method, url: String(url) }); } catch { /* ignore */ }
        // @ts-ignore — passthrough
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
        const url = meta?.url || '';
        if (meta && isTracerUrl(url)) {
            blockedCounter++;
            requestCounter++;
            try { body = rewriteTracerBody(body); } catch { /* ignore */ }
            logger.debug(`🕵️ [#${requestCounter}] XHR → ${url}`, '(fake body)');
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
        this: Window | undefined,
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
        } catch { /* ignore */ }

        if (isTracerUrl(url)) {
            requestCounter++;
            blockedCounter++;
            let body: unknown = init?.body;
            try { body = rewriteTracerBody(body); } catch { /* ignore */ }
            if (init && body !== init.body) {
                init = { ...init, body: body as BodyInit | null | undefined };
            }
            logger.debug(`🕵️ [#${requestCounter}] FETCH → ${url}`, '(fake body)');
        }
        return Reflect.apply(origFetch, this as any, [input, init]);
    }, 'fetch');

    window.fetch = newFetch as typeof window.fetch;
}

// ============================================================
// SEND BEACON
// ------------------------------------------------------------
// Do NOT touch the body: it may be a Blob and wrapping it
// creates a new object that fails Firefox's Xray check.
// Do NOT pass navigator from closure: use caller's `this`.
// ============================================================

function patchBeacon(): void {
    if (!originals) return;
    const orig = originals.beacon;

    const newBeacon = makeNative(function sendBeacon(
        this: Navigator | undefined,
        url: string | URL,
        data?: any,
    ): boolean {
        const urlStr = String(url);
        if (isTracerUrl(urlStr)) {
            requestCounter++;
            blockedCounter++;
            logger.debug(`🕵️ [#${requestCounter}] BEACON → ${urlStr}`, '(passthrough)');
        }
        // Receiver = whoever called us. Never the sandbox navigator.
        return Reflect.apply(orig, this as any, [url, data]);
    }, 'sendBeacon');

    navigator.sendBeacon = newBeacon as typeof navigator.sendBeacon;
}

// ============================================================
// IMAGE PIXEL
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
            requestCounter++;
            blockedCounter++;
            logger.debug(`🕵️ [#${requestCounter}] IMG → ${urlStr}`);
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
    } catch { /* ignore */ }
}

// ============================================================
// WEBSOCKET.SEND
// ============================================================

function patchWebSocket(): void {
    if (typeof WebSocket === 'undefined' || !originals?.wsSend) return;
    const origSend = originals.wsSend;

    const newSend = makeNative(function send(this: WebSocket, data: any) {
        try {
            if (isTracerUrl(this.url)) {
                requestCounter++;
                blockedCounter++;
                logger.debug(`🕵️ [#${requestCounter}] WS → ${this.url}`);
            }
        } catch { /* ignore */ }
        return origSend.call(this, data);
    }, 'send');

    try { WebSocket.prototype.send = newSend; } catch { /* ignore */ }
}

// ============================================================
// STORAGE CLEANER
// ------------------------------------------------------------
// We do NOT patch Storage.prototype — that broke kMax-Mod and
// the host app (sessionStorage was falling back to memory,
// which is why the app logged the user out).
//
// Instead: periodic + event-driven cleanup of tracer-owned
// keys only. Never touches host-app keys. Never throws.
// ============================================================

function installStorageCleaner(): () => void {
    const kill = () => {
        for (const store of [localStorage, sessionStorage]) {
            try {
                const doomed: string[] = [];
                for (let i = 0; i < store.length; i++) {
                    const k = store.key(i);
                    if (k && isTracerStorageKey(k)) doomed.push(k);
                }
                for (const k of doomed) {
                    try { store.removeItem(k); } catch { /* ignore */ }
                }
            } catch { /* ignore */ }
        }
    };

    const onStorage = (e: StorageEvent) => {
        if (!e.key) return;
        if (isTracerStorageKey(e.key)) kill();
    };
    window.addEventListener('storage', onStorage);

    // Fast enough to beat SDK's read, slow enough to be invisible.
    const interval = window.setInterval(kill, 300);

    // Initial sweep.
    kill();

    return () => {
        window.removeEventListener('storage', onStorage);
        window.clearInterval(interval);
    };
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
    } catch { /* ignore */ }
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
            try { delete w[name]; } catch { try { w[name] = undefined; } catch { /* ignore */ } }
        } catch { /* ignore */ }
    }
}

function restoreGlobals(): void {
    if (!originals) return;
    for (const [name, value] of originals.globals) {
        try { (window as any)[name] = value; } catch { /* ignore */ }
    }
    originals.globals.clear();
}

// ============================================================
// CONSOLE FILTER
// ============================================================

let origConsoleError: typeof console.error | null = null;

function patchConsole(): void {
    if (origConsoleError) return;
    origConsoleError = console.error;

    const newError = makeNative(function error(
        this: Console | undefined,
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
        Reflect.apply(origConsoleError!, this as any, args as any);
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
// PURGE COOKIES (one-shot)
// ============================================================

function purgeExistingCookies(): void {
    if (!originals) return;
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
                    } catch { /* ignore */ }
                }
            }
        }
    } catch { /* ignore */ }
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

        cookieDescriptor:
            Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
            Object.getOwnPropertyDescriptor(document, 'cookie'),

        globals: new Map(),
    };

    patchXHR();
    patchFetch();
    patchBeacon();
    patchImageSrc();
    patchWebSocket();
    patchCookies();
    patchConsole();
    killGlobals();
    purgeExistingCookies();

    // Storage: observer + interval only. No prototype patching.
    storageCleanerStop = installStorageCleaner();

    logger.info('🔥 AppTracer blocked (IDs replaced, host app untouched)');
}

export function disable(): void {
    if (!isBlocking) return;
    isBlocking = false;

    if (storageCleanerStop) {
        try { storageCleanerStop(); } catch { /* ignore */ }
        storageCleanerStop = null;
    }

    if (originals) {
        try { XMLHttpRequest.prototype.open = originals.xhrOpen; } catch { /* ignore */ }
        try { XMLHttpRequest.prototype.send = originals.xhrSend; } catch { /* ignore */ }
        try { XMLHttpRequest.prototype.setRequestHeader = originals.xhrSetHeader; } catch { /* ignore */ }

        try { window.fetch = originals.fetch; } catch { /* ignore */ }
        try { navigator.sendBeacon = originals.beacon; } catch { /* ignore */ }

        try {
            if (originals.imageSrc) {
                Object.defineProperty(
                    HTMLImageElement.prototype,
                    'src',
                    originals.imageSrc,
                );
            }
        } catch { /* ignore */ }

        try {
            if (originals.wsSend && typeof WebSocket !== 'undefined') {
                WebSocket.prototype.send = originals.wsSend;
            }
        } catch { /* ignore */ }

        try {
            if (originals.cookieDescriptor) {
                Object.defineProperty(
                    document,
                    'cookie',
                    originals.cookieDescriptor,
                );
            }
        } catch { /* ignore */ }

        restoreConsole();
        restoreGlobals();

        originals = null;
    }

    restoreToStringGuard();

    requestCounter = 0;
    blockedCounter = 0;
    logger.info('✅ AppTracer block disabled (refresh recommended)');
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
// STATS
// ============================================================

export function getStats() {
    return {
        enabled: isBlocking,
        total: requestCounter,
        blocked: blockedCounter,
        fakeDeviceId,
        fakeSessionId,
        fakeUserId,
    };
}