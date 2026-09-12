/*
* @author: potemk.in
* @brief: App config, default settings, selectors, storage keys, validators.
* @desc: Central configuration module. Selectors/texts/storage-keys are aliases
*       into OFFSETS so there's a single source of truth. Validation runs once
*       on module load and warns only for missing values — no double-checking
*       at every call site.
*/

import { OFFSETS } from './offsets';

// ============================================================
// APP
// ============================================================

export const CONFIG = {
    name: 'kMax Mod',
    version: '1.3.5',
    author: 'kiwinatra потемкин короче',
    site: 'max.ru',
} as const;

// ============================================================
// DEFAULTS
// ============================================================

export const DEFAULT_SETTINGS = {
    hideStories: false,
    hideSferum: false,
    replaceTitle: false,
    hidePhone: false,
    blockAnalytics: false,
    showCrown: false,
    showMetadata: false,
    replaceMax: false,
    language: 'ru' as const,
    logView: false,
    fontFamily: 'system-ui, -apple-system, sans-serif',
} as const;

// ============================================================
// ALIASES INTO OFFSETS
// ============================================================

export const SELECTORS = {
    name: OFFSETS.classes.name,
    phone: OFFSETS.classes.phone,
    phoneElement: OFFSETS.classes.phoneElement,
    sferumButton: OFFSETS.classes.sferumButton,
    settingsTab: OFFSETS.classes.settingsTab,
    stories: OFFSETS.classes.stories,
    photoContainer: OFFSETS.classes.photoContainer,
    mover: OFFSETS.classes.mover,
    headerTitle: OFFSETS.classes.headerTitle,
} as const;

export const TEXTS = {
    sferum: OFFSETS.texts.sferum,
    settings: OFFSETS.texts.settings,
    settingsRu: OFFSETS.texts.settingsRu,
} as const;

export const STORAGE_KEYS = {
    hideStories: OFFSETS.storage.keys.hideStories,
    hideSferum: OFFSETS.storage.keys.hideSferum,
    replaceTitle: OFFSETS.storage.keys.replaceTitle,
    hidePhone: OFFSETS.storage.keys.hidePhone,
    blockAnalytics: OFFSETS.storage.keys.blockAnalytics,
    showCrown: OFFSETS.storage.keys.showCrown,
    showMetadata: OFFSETS.storage.keys.showMetadata,
    replaceMax: OFFSETS.storage.keys.replaceMax,
    language: OFFSETS.storage.keys.language,
    logView: 'logView',
    fontFamily: 'fontFamily',
    chatTags: 'chatTags',
    templates: 'templates',
} as const;

// ============================================================
// TYPES
// ============================================================

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;
export type Language = Settings['language'];
export type StorageKey = keyof typeof STORAGE_KEYS;

// ============================================================
// GUARDS / HELPERS
// ============================================================

export function isValidSettingKey(key: string): key is SettingKey {
    return key in DEFAULT_SETTINGS;
}

export function getDefaultSetting<K extends SettingKey>(key: K): Settings[K] {
    return DEFAULT_SETTINGS[key];
}

export function isValidLanguage(lang: string): lang is Language {
    return lang === 'ru' || lang === 'en';
}

export function getAllSettingKeys(): SettingKey[] {
    return Object.keys(DEFAULT_SETTINGS) as SettingKey[];
}

export function getAllStorageKeys(): StorageKey[] {
    return Object.keys(STORAGE_KEYS) as StorageKey[];
}

// ============================================================
// VALIDATION (runs once on module load)
// ============================================================

export function validateSelectors(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(SELECTORS)) {
        if (!value) {
            console.warn(`[KMOD] Empty selector: ${key}`);
            valid = false;
        }
    }
    return valid;
}

export function validateTexts(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(TEXTS)) {
        if (!value) {
            console.warn(`[KMOD] Empty text: ${key}`);
            valid = false;
        }
    }
    return valid;
}

if (typeof window !== 'undefined') {
    if (!validateSelectors() || !validateTexts()) {
        console.warn('[KMOD] Some selectors or texts are empty. Features may not work correctly.');
    }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
    CONFIG,
    DEFAULT_SETTINGS,
    SELECTORS,
    TEXTS,
    STORAGE_KEYS,
    validateSelectors,
    validateTexts,
    isValidSettingKey,
    getDefaultSetting,
    isValidLanguage,
    getAllSettingKeys,
    getAllStorageKeys,
};