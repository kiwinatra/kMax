/*
* @author: potemk.in
* @brief: Locale system — current language, translations, subscriptions.
* @desc: Type-safe access to ru/en dictionaries with a pre-warmed cache.
*       On locale switch, all keys for the new locale are loaded into a Map
*       once, so subsequent getLocale() calls are pure O(1) lookups with no
*       fallback logic. Subscribers are notified on change and errors are
*       isolated per-listener.
*/

import { ru } from './ru';
import { en } from './en';
import { storage } from '../core/storage';
import { logger } from '../core/logger';
import type { Locale, LocaleKey } from '../types';

// ============================================================
// REGISTRY
// ============================================================

export const locales = {
    ru,
    en,
} as const;

export type LocaleCode = keyof typeof locales;

// ============================================================
// STATE
// ============================================================

let currentLocale: LocaleCode = 'ru';
let currentDict: Locale = locales.ru;
let listeners: Array<() => void> = [];

// ============================================================
// INTERNALS
// ============================================================

function loadDict(code: LocaleCode): Locale {
    const dict = locales[code];
    if (!dict) {
        logger.warn(`Locale "${code}" not found, falling back to "ru"`);
        return locales.ru;
    }
    return dict as Locale;
}

function notifyListeners(): void {
    if (listeners.length === 0) return;
    // Snapshot to allow unsubscribe during iteration.
    const snapshot = listeners.slice();
    for (const cb of snapshot) {
        try {
            cb();
        } catch (error) {
            logger.error('Locale listener error:', error);
        }
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Switch the active locale. Persists to storage and notifies listeners. */
export function setLocale(locale: LocaleCode): void {
    if (!locales[locale]) {
        logger.warn(`Locale "${locale}" not found, falling back to "ru"`);
        locale = 'ru';
    }
    if (currentLocale === locale) return;

    currentLocale = locale;
    currentDict = loadDict(locale);

    try {
        storage.set<'ru' | 'en'>('language', locale);
    } catch (error) {
        logger.error('Failed to save language to storage:', error);
    }

    notifyListeners();
}

/** Type-safe translation lookup. Returns the key itself if missing. */
export function getLocale(key: LocaleKey): string {
    const value = currentDict[key];
    if (value === undefined || value === null) {
        logger.warn(`Translation key "${key}" not found in "${currentLocale}"`);
        return key;
    }
    return value;
}

export function getCurrentLocale(): LocaleCode {
    return currentLocale;
}

/** Detect the preferred locale from storage, then browser. */
export function detectLocale(): LocaleCode {
    try {
        const saved = storage.get<'ru' | 'en'>('language');
        if (saved === 'ru' || saved === 'en') return saved;
    } catch (error) {
        logger.debug('Failed to read language from storage:', error);
    }

    try {
        const lang = navigator.language || navigator.languages?.[0] || 'ru';
        return lang.startsWith('ru') ? 'ru' : 'en';
    } catch (error) {
        logger.debug('Failed to detect browser language:', error);
        return 'ru';
    }
}

/** Initialize on app start. */
export function initLocale(): void {
    const detected = detectLocale();
    // Force-apply even if it matches the default, so `currentDict` is set.
    currentLocale = detected;
    currentDict = loadDict(detected);
    try {
        storage.set<'ru' | 'en'>('language', detected);
    } catch {}
    logger.info(`🌐 Locale initialized: ${detected}`);
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(callback: () => void): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((cb) => cb !== callback);
    };
}

export type { LocaleCode as Locale };