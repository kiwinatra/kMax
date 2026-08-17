// src/registry.ts
import { storage } from './core/storage';
import { logger } from './core/logger';
import { enable as enableAnalytics, disable as disableAnalytics } from './features/blockAnalytics';
import { enable as enableCrown, disable as disableCrown } from './features/addCrown';
import { enable as enableMetadata, disable as disableMetadata, apply as applyMetadata } from './features/showMetadata';
import { enable as enableHideStories, disable as disableHideStories, apply as applyHideStories } from './features/hideStories';
import { enable as enableHideSferum, disable as disableHideSferum, apply as applyHideSferum } from './features/hideSferum';
import { enable as enableHidePhone, disable as disableHidePhone, apply as applyHidePhone } from './features/hidePhone';
import { enable as enableReplaceMax, disable as disableReplaceMax, apply as applyReplaceMax } from './features/replaceMax';
import { enable as enableReplaceTitle, disable as disableReplaceTitle, apply as applyReplaceTitle } from './features/replaceTitle';

export interface Feature {
    key: string;
    default: boolean;
    label: string;
    section: 'general' | 'security' | 'appearance' | 'media' | 'other';
    apply: () => void;
    restore?: () => void;
}

export const FEATURES: Record<string, Feature> = {
    hideStories: {
        key: 'hideStories',
        default: false,
        label: 'hideStoriesLabel',
        section: 'general',
        apply: applyHideStories,
        restore: disableHideStories,
    },
    hideSferum: {
        key: 'hideSferum',
        default: false,
        label: 'hideSferumLabel',
        section: 'general',
        apply: applyHideSferum,
        restore: disableHideSferum,
    },
    blockAnalytics: {
        key: 'blockAnalytics',
        default: false,
        label: 'blockAnalyticsLabel',
        section: 'security',
        apply: enableAnalytics,
        restore: disableAnalytics,
    },
    hidePhone: {
        key: 'hidePhone',
        default: false,
        label: 'hidePhoneLabel',
        section: 'security',
        apply: applyHidePhone,
        restore: disableHidePhone,
    },
    showCrown: {
        key: 'showCrown',
        default: false,
        label: 'showCrownLabel',
        section: 'appearance',
        apply: enableCrown,
        restore: disableCrown,
    },
    replaceTitle: {
        key: 'replaceTitle',
        default: false,
        label: 'replaceTitleLabel',
        section: 'appearance',
        apply: applyReplaceTitle,
        restore: disableReplaceTitle,
    },
    showMetadata: {
        key: 'showMetadata',
        default: false,
        label: 'showMetadataLabel',
        section: 'media',
        apply: applyMetadata,
        restore: disableMetadata,
    },
    replaceMax: {
        key: 'replaceMax',
        default: false,
        label: 'replaceMaxLabel',
        section: 'other',
        apply: applyReplaceMax,
        restore: disableReplaceMax,
    },
};

export function getFeatureKeys(): string[] {
    return Object.keys(FEATURES);
}

export function getFeature(key: string): Feature | undefined {
    return FEATURES[key];
}

export function getFeaturesBySection(section: string): [string, Feature][] {
    return Object.entries(FEATURES).filter(([, feature]) => feature.section === section);
}

export function applyAllFeatures(): void {
    for (const [key, feature] of Object.entries(FEATURES)) {
        const enabled = storage.getBoolean(key as any);
        if (enabled && feature.apply) {
            try {
                feature.apply();
            } catch (e) {
                logger.error(`Failed to apply feature: ${key}`, e);
            }
        }
    }
}

export function applyFeature(key: string): void {
    const feature = FEATURES[key];
    if (!feature) return;

    const enabled = storage.getBoolean(key as any);
    if (enabled && feature.apply) {
        feature.apply();
    } else if (feature.restore) {
        feature.restore();
    }
}

// ✅ ЕДИНАЯ ФУНКЦИЯ TOGGLE — ОНА СОХРАНЯЕТ В STORAGE
export function toggleFeature(key: string): boolean {
    const feature = FEATURES[key];
    if (!feature) {
        logger.warn(`Feature not found: ${key}`);
        return false;
    }

    const current = storage.getBoolean(key as any);
    const newState = !current;

    // ✅ СОХРАНЯЕМ В STORAGE
    storage.setBoolean(key as any, newState);
    logger.debug(`Toggle ${key}: ${current} → ${newState}`);

    // Применяем или восстанавливаем
    if (newState && feature.apply) {
        feature.apply();
    } else if (feature.restore) {
        feature.restore();
    }

    return newState;
}

export function isFeatureEnabled(key: string): boolean {
    return storage.getBoolean(key as any);
}