// src/config.ts
import { OFFSETS } from './offsets';

export const CONFIG = {
    name: 'kMax Mod',
    version: '1.0.0',
    author: 'kMax Team',
    site: 'max.ru',
};

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
};

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
};

export const TEXTS = {
    sferum: OFFSETS.texts.sferum,
    settings: OFFSETS.texts.settings,
    settingsRu: OFFSETS.texts.settingsRu,
};

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
} as const;

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;
export type Language = Settings['language'];