// src/registry.ts
import { storage } from './core/storage';
import { logger } from './core/logger';
import { enable as enableAnalytics, disable as disableAnalytics, toggle as toggleAnalytics } from './features/blockAnalytics';
import { enable as enableMetadata, disable as disableMetadata, toggle as toggleMetadata, apply as applyMetadata } from './features/showMetadata';
import { enable as enableHideStories, disable as disableHideStories, toggle as toggleHideStories, apply as applyHideStories } from './features/hideStories';
import { enable as enableHideSferum, disable as disableHideSferum, toggle as toggleHideSferum, apply as applyHideSferum } from './features/hideSferum';
import { enable as enableHidePhone, disable as disableHidePhone, toggle as toggleHidePhone, apply as applyHidePhone } from './features/hidePhone';
import { enable as enableReplaceMax, disable as disableReplaceMax, toggle as toggleReplaceMax, apply as applyReplaceMax } from './features/replaceMax';
import { enable as enableReplaceTitle, disable as disableReplaceTitle, toggle as toggleReplaceTitle, apply as applyReplaceTitle } from './features/replaceTitle';
import { enable as enableCrown, disable as disableCrown, toggle as toggleCrown, apply as applyCrown } from './features/addCrown';


export interface Feature {
    key: string;
    default: boolean;
    label: string;
    section: 'general' | 'appearance';
    apply: () => void;
    restore?: () => void;
    toggle?: () => boolean;
}

export const FEATURES: Record<string, Feature> = {
    blockAnalytics: {
        key: 'blockAnalytics',
        default: false,
        label: 'blockAnalyticsLabel',
        section: 'general',
        apply: enableAnalytics,
        restore: disableAnalytics,
        toggle: toggleAnalytics,
    },
    showCrown: {
    key: 'showCrown',
    default: false,
    label: 'showCrownLabel',
    section: 'appearance',
    apply: applyCrown,
    restore: disableCrown,
    toggle: toggleCrown,
},
    showMetadata: {
        key: 'showMetadata',
        default: false,
        label: 'showMetadataLabel',
        section: 'general',
        apply: applyMetadata,
        restore: disableMetadata,
        toggle: toggleMetadata,
    },
    hideStories: {
        key: 'hideStories',
        default: false,
        label: 'hideStoriesLabel',
        section: 'appearance',
        apply: applyHideStories,
        restore: disableHideStories,
        toggle: toggleHideStories,
    },
    hideSferum: {
        key: 'hideSferum',
        default: false,
        label: 'hideSferumLabel',
        section: 'general',
        apply: applyHideSferum,
        restore: disableHideSferum,
        toggle: toggleHideSferum,
    },
    hidePhone: {
        key: 'hidePhone',
        default: false,
        label: 'hidePhoneLabel',
        section: 'appearance',
        apply: applyHidePhone,
        restore: disableHidePhone,
        toggle: toggleHidePhone,
    },
    replaceMax: {
        key: 'replaceMax',
        default: false,
        label: 'replaceMaxLabel',
        section: 'appearance',
        apply: applyReplaceMax,
        restore: disableReplaceMax,
        toggle: toggleReplaceMax,
    },
    replaceTitle: {
        key: 'replaceTitle',
        default: false,
        label: 'replaceTitleLabel',
        section: 'appearance',
        apply: applyReplaceTitle,
        restore: disableReplaceTitle,
        toggle: toggleReplaceTitle,
    },
};

export function getFeatureKeys(): string[] {
    return Object.keys(FEATURES);
}

export function getFeature(key: string): Feature | undefined {
    return FEATURES[key];
}

export function getFeaturesBySection(section: 'general' | 'appearance'): [string, Feature][] {
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

export function toggleFeature(key: string): boolean {
    const feature = FEATURES[key];
    if (!feature) return false;

    if (feature.toggle) {
        return feature.toggle();
    }

    const current = storage.getBoolean(key as any);
    const newState = !current;
    storage.setBoolean(key as any, newState);

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