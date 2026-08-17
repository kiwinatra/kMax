// src/types.ts
export interface Config {
    name: string;
    version: string;
    author: string;
    site: string;
}

export interface Settings {
    hideStories: boolean;
    hideSferum: boolean;
    replaceTitle: boolean;
    hidePhone: boolean;
    blockAnalytics: boolean;
    showCrown: boolean;
    showMetadata: boolean;
    replaceMax: boolean;
    language: 'ru' | 'en';
}

export interface Locale {
    settingsTitle: string;
    settingsSubtitle: string;
    settingsGeneral: string;
    settingsAppearance: string;
    settingsAbout: string;
    hideStoriesLabel: string;
    hideSferumLabel: string;
    replaceTitleLabel: string;
    hidePhoneLabel: string;
    blockAnalyticsLabel: string;
    showCrownLabel: string;
    showMetadataLabel: string;
    replaceMaxLabel: string;
    languageLabel: string;
    languageRu: string;
    languageEn: string;
    faqTitle: string;
    faqSubtitle: string;
}

export type LocaleKey = keyof Locale;
export type LocaleMap = Record<string, Locale>;

export interface ButtonOptions {
    text: string;
    icon?: string;
    className?: string;
    onClick: () => void;
}

export interface ModalOptions {
    title: string;
    content: HTMLElement | string;
    onClose?: () => void;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
}

export interface ObserverCallback {
    (): void;
}

export type StorageKey = 
    | 'hideStories' 
    | 'hideSferum' 
    | 'replaceTitle' 
    | 'hidePhone' 
    | 'blockAnalytics' 
    | 'showCrown' 
    | 'showMetadata' 
    | 'replaceMax' 
    | 'language';