/*
* @author: potemk.in
* @brief: Central type definitions for the app: Config, Settings, Locale, StorageKey, features, and utility types.
* @desc: Single source of truth for all shared types. Locale now includes every key actually used in ru.ts / en.ts (chats, templates, fontFamily, logView). StorageKey matches the real set used by the storage layer. Type guards are cheap and cache-free.
*/

// ============================================================
// CONFIG & SETTINGS
// ============================================================

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

// ============================================================
// LOCALE
// ============================================================

export interface Locale {
    // Headers
    settingsTitle: string;
    settingsSubtitle: string;

    // Sections (sidebar)
    sectionGeneral: string;
    sectionSecurity: string;
    sectionAppearance: string;
    sectionMedia: string;
    sectionOther: string;
    sectionLanguage: string;
    sectionAbout: string;
    sectionChats: string;

    // Section descriptions
    sectionGeneralDesc: string;
    sectionSecurityDesc: string;
    sectionAppearanceDesc: string;
    sectionMediaDesc: string;
    sectionOtherDesc: string;
    sectionLanguageDesc: string;
    sectionAboutDesc: string;
    sectionChatsDesc: string;

    // Feature labels + descriptions
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

    fontFamilyLabel: string;
    fontFamilyDesc: string;

    showMetadataLabel: string;
    showMetadataDesc: string;

    replaceMaxLabel: string;
    replaceMaxDesc: string;
    logViewLabel: string;
    logViewDesc: string;

    chatTagsLabel: string;
    chatTagsDesc: string;
    templatesLabel: string;
    templatesDesc: string;

    // Language
    languageLabel: string;
    languageRu: string;
    languageEn: string;

    // About
    aboutName: string;
    aboutVersion: string;
    aboutAuthor: string;
    aboutDescription: string;

    // Buttons
    saveButton: string;
    resetButton: string;
    resetConfirm: string;
    closeButton: string;

    // Statuses
    statusActive: string;
    statusEnabled: string;
    statusDisabled: string;

    // Toggles / navigation
    toggleOn: string;
    toggleOff: string;
    backToSettings: string;

    // Font family labels (system)
    fontFamilySystemUI: string;
    fontFamilyArial: string;
    fontFamilyArialBlack: string;
    fontFamilyGeorgia: string;
    fontFamilyTimesNewRoman: string;
    fontFamilyCourierNew: string;
    fontFamilyVerdana: string;
    fontFamilyTahoma: string;
    fontFamilyTrebuchetMS: string;
    fontFamilyImpact: string;
    fontFamilyComicSansMS: string;
    fontFamilyLucidaSans: string;
    fontFamilyGeneva: string;
    fontFamilyPalatino: string;
    fontFamilyBookman: string;
    fontFamilyGaramond: string;
    fontFamilyHelvetica: string;
    fontFamilyFranklinGothic: string;
    fontFamilyCenturyGothic: string;
    fontFamilyCopperplate: string;
    fontFamilyBaskerville: string;

    // Font family labels (Google)
    fontFamilyInter: string;
    fontFamilyRoboto: string;
    fontFamilyOpenSans: string;
    fontFamilyMontserrat: string;
    fontFamilyOswald: string;
    fontFamilyRaleway: string;
    fontFamilyLato: string;
    fontFamilyPlayfairDisplay: string;
    fontFamilyMerriweather: string;
    fontFamilyUbuntu: string;
    fontFamilyNunito: string;
    fontFamilyPoppins: string;
    fontFamilyQuicksand: string;
    fontFamilyFiraSans: string;
    fontFamilySourceSansPro: string;
    fontFamilyPTSans: string;
    fontFamilyIBMPlexSans: string;
    fontFamilyManrope: string;
    fontFamilyJetBrainsMono: string;
    fontFamilyCaveat: string;
    fontFamilyMarckScript: string;
}

export type LocaleKey = keyof Locale;
export type LocaleMap = Record<string, Locale>;

// ============================================================
// STORAGE
// ============================================================

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

// ============================================================
// FEATURES
// ============================================================

export type FeatureSection =
    | 'general'
    | 'security'
    | 'appearance'
    | 'media'
    | 'other'
    | 'chats';

export interface Feature {
    key: string;
    default: boolean;
    label: string;
    section: FeatureSection;
    apply: () => void;
    restore?: () => void;
}

export type FeatureMap = Record<string, Feature>;

// ============================================================
// UI
// ============================================================

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

// ============================================================
// OBSERVER
// ============================================================

export type ObserverCallback = () => void;

export interface ObserverOptions {
    childList?: boolean;
    subtree?: boolean;
    characterData?: boolean;
    attributes?: boolean;
    attributeFilter?: string[];
}

// ============================================================
// UTILITIES
// ============================================================

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

// ============================================================
// TYPE GUARDS
// ============================================================

const STORAGE_KEY_SET: Set<string> = new Set([
    'hideStories',
    'hideSferum',
    'replaceTitle',
    'hidePhone',
    'blockAnalytics',
    'showCrown',
    'showMetadata',
    'replaceMax',
    'language',
    'logView',
    'fontFamily',
    'chatTags',
    'templates',
]);

/** Cheap runtime check for StorageKey — no sample object allocation. */
export function isStorageKey(key: string): key is StorageKey {
    return STORAGE_KEY_SET.has(key);
}

/**
 * Runtime check for LocaleKey.
 * A cached sample object is used once at module load, then reused.
 */
const LOCALE_SAMPLE: Locale = {
    settingsTitle: '',
    settingsSubtitle: '',
    sectionGeneral: '',
    sectionSecurity: '',
    sectionAppearance: '',
    sectionMedia: '',
    sectionOther: '',
    sectionLanguage: '',
    sectionAbout: '',
    sectionChats: '',
    sectionGeneralDesc: '',
    sectionSecurityDesc: '',
    sectionAppearanceDesc: '',
    sectionMediaDesc: '',
    sectionOtherDesc: '',
    sectionLanguageDesc: '',
    sectionAboutDesc: '',
    sectionChatsDesc: '',
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
    fontFamilyLabel: '',
    fontFamilyDesc: '',
    showMetadataLabel: '',
    showMetadataDesc: '',
    replaceMaxLabel: '',
    replaceMaxDesc: '',
    logViewLabel: '',
    logViewDesc: '',
    chatTagsLabel: '',
    chatTagsDesc: '',
    templatesLabel: '',
    templatesDesc: '',
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
    fontFamilySystemUI: '',
    fontFamilyArial: '',
    fontFamilyArialBlack: '',
    fontFamilyGeorgia: '',
    fontFamilyTimesNewRoman: '',
    fontFamilyCourierNew: '',
    fontFamilyVerdana: '',
    fontFamilyTahoma: '',
    fontFamilyTrebuchetMS: '',
    fontFamilyImpact: '',
    fontFamilyComicSansMS: '',
    fontFamilyLucidaSans: '',
    fontFamilyGeneva: '',
    fontFamilyPalatino: '',
    fontFamilyBookman: '',
    fontFamilyGaramond: '',
    fontFamilyHelvetica: '',
    fontFamilyFranklinGothic: '',
    fontFamilyCenturyGothic: '',
    fontFamilyCopperplate: '',
    fontFamilyBaskerville: '',
    fontFamilyInter: '',
    fontFamilyRoboto: '',
    fontFamilyOpenSans: '',
    fontFamilyMontserrat: '',
    fontFamilyOswald: '',
    fontFamilyRaleway: '',
    fontFamilyLato: '',
    fontFamilyPlayfairDisplay: '',
    fontFamilyMerriweather: '',
    fontFamilyUbuntu: '',
    fontFamilyNunito: '',
    fontFamilyPoppins: '',
    fontFamilyQuicksand: '',
    fontFamilyFiraSans: '',
    fontFamilySourceSansPro: '',
    fontFamilyPTSans: '',
    fontFamilyIBMPlexSans: '',
    fontFamilyManrope: '',
    fontFamilyJetBrainsMono: '',
    fontFamilyCaveat: '',
    fontFamilyMarckScript: '',
};

const LOCALE_KEY_SET: Set<string> = new Set(Object.keys(LOCALE_SAMPLE));

export function isLocaleKey(key: string): key is LocaleKey {
    return LOCALE_KEY_SET.has(key);
}

export default {
    isLocaleKey,
    isStorageKey,
};