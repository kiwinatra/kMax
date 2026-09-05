// src/core/storage.ts

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

// Флаг для отладки storage (выключен по умолчанию)
let debugMode = false;

export const storage = {
    /**
     * Включить/выключить отладку storage
     */
    setDebug(enabled: boolean): void {
        debugMode = enabled;
    },

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

    getBoolean(key: StorageKey): boolean {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
        // Приводим значение по умолчанию к boolean (гарантирует тип boolean)
        return Boolean(DEFAULTS[key as keyof Settings]);
    }
    try {
        return Boolean(JSON.parse(raw));
    } catch {
        // Если не JSON, сравниваем с 'true'
        return raw === 'true';
    }
},

    setBoolean(key: StorageKey, value: boolean): void {
        this.set<boolean>(key, value);
    },

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

    /**
     * Сброс всех настроек в значения по умолчанию
     */
    resetToDefaults(): void {
        for (const [key, value] of Object.entries(DEFAULTS)) {
            this.set(key as StorageKey, value);
        }
        if (debugMode) {
            console.log('🔄 [STORAGE] Reset to defaults');
        }
    },

    /**
     * Полное удаление всех ключей kmod
     */
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

    /**
     * Проверка существования ключа
     */
    has(key: StorageKey): boolean {
        return localStorage.getItem(PREFIX + key) !== null;
    },

    /**
     * Получение всех ключей с префиксом kmod
     */
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

    /**
     * Получение всех значений (только kmod)
     */
    getAllValues(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        const keys = this.getAllKeys();
        for (const key of keys) {
            result[key] = this.get(key as StorageKey);
        }
        return result;
    },
};

// Экспортируем DEFAULTS для использования в других модулях
export { DEFAULTS as STORAGE_DEFAULTS };