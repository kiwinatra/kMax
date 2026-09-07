/*
* @author: potemk.in
* @brief: Application configuration, default settings, selectors, storage keys, and validation utilities.
* @desc: This file defines the core configuration constants including app metadata, default settings, DOM selectors from OFFSETS, storage keys, and type definitions. It also provides validation functions to ensure all selectors and text values are properly defined at runtime.
*/

import { OFFSETS } from './offsets';

export const CONFIG = {
    name: 'kMax Mod',
    version: '1.3.5',
    author: 'kiwinatra потемкин короче',
    site: 'max.ru',
} as const;

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

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;
export type Language = Settings['language'];
export type StorageKey = keyof typeof STORAGE_KEYS;

// Function for checking if a string is a valid setting key
export function isValidSettingKey(key: string): key is SettingKey {
    return key in DEFAULT_SETTINGS;
}

// Function for retrieving the default value for a setting
export function getDefaultSetting<K extends SettingKey>(key: K): Settings[K] {
    return DEFAULT_SETTINGS[key];
}

// Function for checking if a language code is valid
export function isValidLanguage(lang: string): lang is Language {
    return lang === 'ru' || lang === 'en';
}

// Function for retrieving all setting keys
export function getAllSettingKeys(): SettingKey[] {
    return Object.keys(DEFAULT_SETTINGS) as SettingKey[];
}

// Function for retrieving all storage keys
export function getAllStorageKeys(): StorageKey[] {
    return Object.keys(STORAGE_KEYS) as StorageKey[];
}

// Function for validating that all selectors are non-empty
export function validateSelectors(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(SELECTORS)) {
        if (!value || (value as string).length === 0) {
            console.warn(`[KMOD] Empty selector: ${key}`);
            valid = false;
        }
    }
    return valid;
}

// Function for validating that all text constants are non-empty
export function validateTexts(): boolean {
    let valid = true;
    for (const [key, value] of Object.entries(TEXTS)) {
        if (!value || (value as string).length === 0) {
            console.warn(`[KMOD] Empty text: ${key}`);
            valid = false;
        }
    }
    return valid;
}

if (typeof window !== 'undefined') {
    const isValid = validateSelectors() && validateTexts();
    if (!isValid) {
        console.warn('[KMOD] Some selectors or texts are empty. Features may not work correctly.');
    }
}

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