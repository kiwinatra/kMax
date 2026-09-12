/*
* @author: potemk.in
* @brief: LocalStorage wrapper with in-memory cache for fast, synchronized access.
* @desc: Provides typed access to localStorage with an in-memory cache layer to avoid repeated disk reads. Cache is invalidated on writes. Supports booleans, strings, objects, debug mode, and cross-feature settings (chatTags, templates, fontFamily).
*/

export type StorageKey =
    | 'hideStories'
    | 'hideSferum'
    | 'replaceTitle'
    | 'hidePhone'
    | 'blockAnalytics'
    | 'showCrown'
    | 'showMetadata'
    | 'replaceMax'
    | 'language'
    | 'logView'
    | 'fontFamily'
    | 'chatTags'
    | 'templates';

interface Settings {
    hideStories: boolean;
    hideSferum: boolean;
    replaceTitle: boolean;
    hidePhone: boolean;
    blockAnalytics: boolean;
    showCrown: boolean;
    showMetadata: boolean;
    replaceMax: boolean;
    language: 'ru' | 'en';
    logView: boolean;
}

const DEFAULTS: Settings = {
    hideStories: false,
    hideSferum: false,
    replaceTitle: false,
    hidePhone: false,
    blockAnalytics: false,
    showCrown: false,
    showMetadata: false,
    replaceMax: false,
    language: 'ru',
    logView: false,
};

const PREFIX = 'kmod_';

// ============================================================
// IN-MEMORY CACHE
// ============================================================

const cache = new Map<StorageKey, unknown>();
let debugMode = false;

function logDebug(...args: unknown[]): void {
    if (debugMode) console.log('[STORAGE]', ...args);
}

// ============================================================
// LOW-LEVEL ACCESS
// ============================================================

function readRaw(key: StorageKey): string | null {
    try {
        return localStorage.getItem(PREFIX + key);
    } catch {
        return null;
    }
}

// ============================================================
// GENERIC GET / SET / REMOVE (with cache)
// ============================================================

function getValue<T = unknown>(key: StorageKey): T | null {
    if (cache.has(key)) {
        const v = cache.get(key);
        return (v === undefined ? null : v) as T | null;
    }
    const raw = readRaw(key);
    if (raw === null) {
        cache.set(key, null);
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as T;
        cache.set(key, parsed);
        return parsed;
    } catch {
        cache.set(key, null);
        return null;
    }
}

function setValue<T = unknown>(key: StorageKey, value: T): void {
    cache.set(key, value);
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        logDebug(`Saved ${PREFIX + key} =`, value);
    } catch (error) {
        console.error(`[STORAGE] Set error for "${key}":`, error);
    }
}

function removeValue(key: StorageKey): void {
    cache.delete(key);
    try {
        localStorage.removeItem(PREFIX + key);
        logDebug(`Removed ${PREFIX + key}`);
    } catch (error) {
        console.error(`[STORAGE] Remove error for "${key}":`, error);
    }
}

// ============================================================
// BOOLEAN HELPERS (with cache)
// ============================================================

function getBooleanValue(key: StorageKey): boolean {
    if (cache.has(key)) {
        return Boolean(cache.get(key));
    }
    const raw = readRaw(key);
    let value: boolean;
    if (raw === null) {
        value = Boolean(DEFAULTS[key as keyof Settings]);
    } else {
        try {
            value = Boolean(JSON.parse(raw));
        } catch {
            value = raw === 'true';
        }
    }
    cache.set(key, value);
    return value;
}

function setBooleanValue(key: StorageKey, value: boolean): void {
    setValue(key, value);
}

// ============================================================
// AGGREGATE ACCESS
// ============================================================

function getAllSettings(): Settings {
    return {
        hideStories: getBooleanValue('hideStories'),
        hideSferum: getBooleanValue('hideSferum'),
        replaceTitle: getBooleanValue('replaceTitle'),
        hidePhone: getBooleanValue('hidePhone'),
        blockAnalytics: getBooleanValue('blockAnalytics'),
        showCrown: getBooleanValue('showCrown'),
        showMetadata: getBooleanValue('showMetadata'),
        replaceMax: getBooleanValue('replaceMax'),
        language: getValue<'ru' | 'en'>('language') || 'ru',
        logView: getBooleanValue('logView'),
    };
}

function getAllKeysList(): string[] {
    const keys: string[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
                keys.push(key.slice(PREFIX.length));
            }
        }
    } catch {}
    return keys;
}

function getAllStoredValues(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of getAllKeysList()) {
        result[key] = getValue(key as StorageKey);
    }
    return result;
}

// ============================================================
// RESET / CLEAR / HAS
// ============================================================

function resetToDefaults(): void {
    for (const [key, value] of Object.entries(DEFAULTS)) {
        setValue(key as StorageKey, value);
    }
    logDebug('Reset to defaults');
}

function clearAllStorage(): void {
    const keys: StorageKey[] = [
        'hideStories', 'hideSferum', 'replaceTitle', 'hidePhone',
        'blockAnalytics', 'showCrown', 'showMetadata', 'replaceMax',
        'language', 'logView', 'fontFamily', 'chatTags', 'templates',
    ];
    for (const key of keys) {
        removeValue(key);
    }
    logDebug('All keys cleared');
}

function hasValue(key: StorageKey): boolean {
    if (cache.has(key)) return cache.get(key) !== null;
    return readRaw(key) !== null;
}

// ============================================================
// PUBLIC API
// ============================================================

export const storage = {
    /** Enable debug logging of storage operations. */
    setDebug(enabled: boolean): void {
        debugMode = enabled;
    },

    /** Read a value (cached). Returns null if missing or unparsable. */
    get: getValue,

    /** Write a value (updates cache + localStorage). */
    set: setValue,

    /** Remove a value (updates cache + localStorage). */
    remove: removeValue,

    /** Read a boolean value with default fallback. */
    getBoolean: getBooleanValue,

    /** Write a boolean value. */
    setBoolean: setBooleanValue,

    /** Snapshot of all known settings as a typed object. */
    getAll: getAllSettings,

    /** Reset all settings to defaults. */
    resetToDefaults,

    /** Remove all kmod_* keys (including chatTags, templates, fontFamily). */
    clearAll: clearAllStorage,

    /** True if the key exists in cache or localStorage. */
    has: hasValue,

    /** List of kmod_* keys (without prefix). */
    getAllKeys: getAllKeysList,

    /** Map of every kmod_* key to its parsed value. */
    getAllValues: getAllStoredValues,

    /** Drop the whole in-memory cache (rarely needed). */
    invalidateCache(): void {
        cache.clear();
    },
};

export { DEFAULTS as STORAGE_DEFAULTS };
export type { Settings as StorageSettings };