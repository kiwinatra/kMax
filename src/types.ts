/*
* @author: potemk.in
* @brief: TypeScript type definitions for application configuration, settings, locales, and utility functions.
* @desc: This file defines all the core types and interfaces used across the application, including configuration, settings, locale strings, UI options, observer options, storage keys, feature definitions, DOM utilities, logger levels, and helper types. It also provides type guard functions for locale and storage keys.
*/

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
    logView: boolean;
    fontFamily: string;
}

export interface Locale {
    settingsTitle: string;
    settingsSubtitle: string;
    
    sectionGeneral: string;
    sectionSecurity: string;
    sectionAppearance: string;
    sectionMedia: string;
    sectionOther: string;
    sectionLanguage: string;
    sectionAbout: string;
    
    sectionGeneralDesc: string;
    sectionSecurityDesc: string;
    sectionAppearanceDesc: string;
    sectionMediaDesc: string;
    sectionOtherDesc: string;
    sectionLanguageDesc: string;
    sectionAboutDesc: string;
    
    hideStoriesLabel: string;
    hideStoriesDesc: string;
    hideSferumLabel: string;
    hideSferumDesc: string;
    
    blockAnalyticsLabel: string;
    blockAnalyticsDesc: string;
    hidePhoneLabel: string;
    hidePhoneDesc: string;
    
    showCrownLabel: string;
    showCrownDesc: string;
    replaceTitleLabel: string;
    replaceTitleDesc: string;
    
    showMetadataLabel: string;
    showMetadataDesc: string;
    
    replaceMaxLabel: string;
    replaceMaxDesc: string;
    logViewLabel: string;
    logViewDesc: string;
    
    languageLabel: string;
    languageRu: string;
    languageEn: string;
    
    aboutName: string;
    aboutVersion: string;
    aboutAuthor: string;
    aboutDescription: string;
    
    saveButton: string;
    resetButton: string;
    resetConfirm: string;
    closeButton: string;
    
    statusActive: string;
    statusEnabled: string;
    statusDisabled: string;
    
    toggleOn: string;
    toggleOff: string;
    backToSettings: string;
}

export type LocaleKey = keyof Locale;
export type LocaleMap = Record<string, Locale>;

export interface ButtonOptions {
    text: string;
    icon?: string;
    className?: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}

export interface ModalOptions {
    title: string;
    content: HTMLElement | string;
    onClose?: () => void;
    onOpen?: () => void;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
}

export type ObserverCallback = () => void;

export interface ObserverOptions {
    childList?: boolean;
    subtree?: boolean;
    characterData?: boolean;
    attributes?: boolean;
    attributeFilter?: string[];
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
    | 'language'
    | 'logView'
    | 'fontFamily'
    | 'chatTags'
    | 'templates';

export type FeatureSection = 'general' | 'security' | 'appearance' | 'media' | 'other';

export interface Feature {
    key: string;
    default: boolean;
    label: string;
    section: FeatureSection;
    apply: () => void;
    restore?: () => void;
}

export type FeatureMap = Record<string, Feature>;

export interface ElementOptions {
    className?: string;
    id?: string;
    text?: string;
    html?: string;
    attrs?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    events?: Record<string, EventListener>;
    dataset?: Record<string, string>;
}

export interface WaitOptions {
    timeout?: number;
    interval?: number;
    throwOnTimeout?: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ReadonlyDeep<T> = {
    readonly [P in keyof T]: T[P] extends object ? ReadonlyDeep<T[P]> : T[P];
};

export type ValueOf<T> = T[keyof T];
export type KeyOf<T> = keyof T;

// Function for checking if a string is a valid locale key
export function isLocaleKey(key: string): key is LocaleKey {
    const sampleLocale: Locale = {
        settingsTitle: '',
        settingsSubtitle: '',
        sectionGeneral: '',
        sectionSecurity: '',
        sectionAppearance: '',
        sectionMedia: '',
        sectionOther: '',
        sectionLanguage: '',
        sectionAbout: '',
        sectionGeneralDesc: '',
        sectionSecurityDesc: '',
        sectionAppearanceDesc: '',
        sectionMediaDesc: '',
        sectionOtherDesc: '',
        sectionLanguageDesc: '',
        sectionAboutDesc: '',
        hideStoriesLabel: '',
        hideStoriesDesc: '',
        hideSferumLabel: '',
        hideSferumDesc: '',
        blockAnalyticsLabel: '',
        blockAnalyticsDesc: '',
        hidePhoneLabel: '',
        hidePhoneDesc: '',
        showCrownLabel: '',
        showCrownDesc: '',
        replaceTitleLabel: '',
        replaceTitleDesc: '',
        showMetadataLabel: '',
        showMetadataDesc: '',
        replaceMaxLabel: '',
        replaceMaxDesc: '',
        logViewLabel: '',
        logViewDesc: '',
        languageLabel: '',
        languageRu: '',
        languageEn: '',
        aboutName: '',
        aboutVersion: '',
        aboutAuthor: '',
        aboutDescription: '',
        saveButton: '',
        resetButton: '',
        resetConfirm: '',
        closeButton: '',
        statusActive: '',
        statusEnabled: '',
        statusDisabled: '',
        toggleOn: '',
        toggleOff: '',
        backToSettings: '',
    };
    return key in sampleLocale;
}

// Function for checking if a string is a valid storage key
export function isStorageKey(key: string): key is StorageKey {
    const storageKeys: StorageKey[] = [
        'hideStories', 'hideSferum', 'replaceTitle', 'hidePhone',
        'blockAnalytics', 'showCrown', 'showMetadata', 'replaceMax',
        'language', 'logView'
    ];
    return storageKeys.includes(key as StorageKey);
}

export default {
    isLocaleKey,
    isStorageKey,
};