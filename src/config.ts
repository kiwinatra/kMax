// src/config.ts

import { OFFSETS } from './offsets';

// ============================================================
// КОНСТАНТЫ
// ============================================================

export const CONFIG = {
    name: 'kMax Mod',
    version: '1.3.5',
    author: 'kiwinatra потемкин короче',
    site: 'max.ru',
} as const;

// ============================================================
// НАСТРОЙКИ ПО УМОЛЧАНИЮ
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
// СЕЛЕКТОРЫ (с валидацией)
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

// ============================================================
// ТЕКСТЫ
// ============================================================

export const TEXTS = {
    sferum: OFFSETS.texts.sferum,
    settings: OFFSETS.texts.settings,
    settingsRu: OFFSETS.texts.settingsRu,
} as const;

// ============================================================
// КЛЮЧИ STORAGE
// ============================================================

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
// ТИПЫ
// ============================================================

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;
export type Language = Settings['language'];
export type StorageKey = keyof typeof STORAGE_KEYS;

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Проверка валидности значения настройки
 */
export function isValidSettingKey(key: string): key is SettingKey {
    return key in DEFAULT_SETTINGS;
}

/**
 * Получение значения по умолчанию для настройки
 */
export function getDefaultSetting<K extends SettingKey>(key: K): Settings[K] {
    return DEFAULT_SETTINGS[key];
}

/**
 * Проверка, является ли язык валидным
 */
export function isValidLanguage(lang: string): lang is Language {
    return lang === 'ru' || lang === 'en';
}

/**
 * Получение всех ключей настроек
 */
export function getAllSettingKeys(): SettingKey[] {
    return Object.keys(DEFAULT_SETTINGS) as SettingKey[];
}

/**
 * Получение всех ключей storage
 */
export function getAllStorageKeys(): StorageKey[] {
    return Object.keys(STORAGE_KEYS) as StorageKey[];
}

// ============================================================
// ВАЛИДАЦИЯ КОНФИГА (при запуске)
// ============================================================

/**
 * Проверка, что все селекторы не пустые
 */
export function validateSelectors(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(SELECTORS)) {
        // Приводим к строке для проверки
        if (!value || (value as string).length === 0) {
            console.warn(`[KMOD] Empty selector: ${key}`);
            valid = false;
        }
    }
    return valid;
}

/**
 * Проверка, что все тексты не пустые
 */
export function validateTexts(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(TEXTS)) {
        // Приводим к строке для проверки
        if (!value || (value as string).length === 0) {
            console.warn(`[KMOD] Empty text: ${key}`);
            valid = false;
        }
    }
    return valid;
}

// Автоматическая валидация при импорте
if (typeof window !== 'undefined') {
    const isValid = validateSelectors() && validateTexts();
    if (!isValid) {
        console.warn('[KMOD] Some selectors or texts are empty. Features may not work correctly.');
    }
}

// ============================================================
// ЭКСПОРТ ДЛЯ СОВМЕСТИМОСТИ
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