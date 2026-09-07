/*
* @author: potemk.in
* @brief: LocalStorage wrapper for persistent settings with type safety and debug support.
* @desc: This file provides a typed storage system for managing application settings in localStorage. It includes getters and setters for boolean and generic values, default values, reset functionality, key listing, and debug mode for tracking operations. All methods handle errors gracefully.
*/

type StorageKey = 
    | 'hideStories' 
    | 'hideSferum' 
    | 'replaceTitle' 
    | 'hidePhone' 
    | 'blockAnalytics' 
    | 'showCrown' 
    | 'showMetadata' 
    | 'replaceMax'
    | 'language'
    | 'logView';

interface Settings {
    hideStories: boolean;
    hideSferum: boolean;
    replaceTitle: boolean;
    hidePhone: boolean;
    blockAnalytics: boolean;
    showCrown: boolean;
    showMetadata: boolean;
    language: 'ru' | 'en';
    logView: boolean;
    replaceMax: boolean;
}

const DEFAULTS: Settings = {
    hideStories: false,
    hideSferum: false,
    replaceTitle: false,
    hidePhone: false,
    blockAnalytics: false,
    showCrown: false,
    showMetadata: false,
    language: 'ru',
    logView: false,
    replaceMax: false,
};

const PREFIX = 'kmod_';

let debugMode = false;

export const storage = {
    // Function for enabling or disabling storage debug mode
    setDebug(enabled: boolean): void {
        debugMode = enabled;
    },

    // Function for retrieving a value from storage
    get<T = unknown>(key: StorageKey): T | null {
        try {
            const value = localStorage.getItem(PREFIX + key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            if (debugMode) {
                console.error(`[STORAGE] Get error for "${key}":`, error);
            }
            return null;
        }
    },

    // Function for storing a value in storage
    set<T = unknown>(key: StorageKey, value: T): void {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
            if (debugMode) {
                console.log(`💾 [STORAGE] Saved ${PREFIX + key} =`, value);
            }
        } catch (error) {
            console.error(`[STORAGE] Set error for "${key}":`, error);
        }
    },

    // Function for removing a key from storage
    remove(key: StorageKey): void {
        try {
            localStorage.removeItem(PREFIX + key);
            if (debugMode) {
                console.log(`🗑️ [STORAGE] Removed ${PREFIX + key}`);
            }
        } catch (error) {
            console.error(`[STORAGE] Remove error for "${key}":`, error);
        }
    },

    // Function for retrieving a boolean value from storage
    getBoolean(key: StorageKey): boolean {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
        return Boolean(DEFAULTS[key as keyof Settings]);
    }
    try {
        return Boolean(JSON.parse(raw));
    } catch {
        return raw === 'true';
    }
},

    // Function for storing a boolean value in storage
    setBoolean(key: StorageKey, value: boolean): void {
        this.set<boolean>(key, value);
    },

    // Function for retrieving all settings from storage
    getAll(): Settings {
        return {
            hideStories: this.getBoolean('hideStories'),
            hideSferum: this.getBoolean('hideSferum'),
            replaceTitle: this.getBoolean('replaceTitle'),
            hidePhone: this.getBoolean('hidePhone'),
            blockAnalytics: this.getBoolean('blockAnalytics'),
            showCrown: this.getBoolean('showCrown'),
            showMetadata: this.getBoolean('showMetadata'),
            language: this.get<'ru' | 'en'>('language') || 'ru',
            logView: this.getBoolean('logView'),
            replaceMax: this.getBoolean('replaceMax'),
        };
    },

    // Function for resetting all settings to default values
    resetToDefaults(): void {
        for (const [key, value] of Object.entries(DEFAULTS)) {
            this.set(key as StorageKey, value);
        }
        if (debugMode) {
            console.log('🔄 [STORAGE] Reset to defaults');
        }
    },

    // Function for clearing all kmod storage keys
    clearAll(): void {
        const keys: StorageKey[] = [
            'hideStories', 'hideSferum', 'replaceTitle', 'hidePhone',
            'blockAnalytics', 'showCrown', 'showMetadata', 'replaceMax',
            'language', 'logView'
        ];
        for (const key of keys) {
            this.remove(key);
        }
        if (debugMode) {
            console.log('🧹 [STORAGE] All keys cleared');
        }
    },

    // Function for checking if a key exists in storage
    has(key: StorageKey): boolean {
        return localStorage.getItem(PREFIX + key) !== null;
    },

    // Function for retrieving all kmod keys from storage
    getAllKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(PREFIX)) {
                keys.push(key.replace(PREFIX, ''));
            }
        }
        return keys;
    },

    // Function for retrieving all kmod values from storage
    getAllValues(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        const keys = this.getAllKeys();
        for (const key of keys) {
            result[key] = this.get(key as StorageKey);
        }
        return result;
    },
};

export { DEFAULTS as STORAGE_DEFAULTS };