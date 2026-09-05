// src/registry.ts

import { storage } from './core/storage';
import { logger } from './core/logger';
import { whenIdle } from './core/performance';

// Импорты фич
import { enable as enableAnalytics, disable as disableAnalytics } from './features/blockAnalytics';
import { enable as enableCrown, disable as disableCrown, apply as applyCrown } from './features/addCrown';
import { enable as enableMetadata, disable as disableMetadata, apply as applyMetadata } from './features/showMetadata';
import { enable as enableHideStories, disable as disableHideStories, apply as applyHideStories } from './features/hideStories';
import { enable as enableHideSferum, disable as disableHideSferum, apply as applyHideSferum } from './features/hideSferum';
import { enable as enableHidePhone, disable as disableHidePhone, apply as applyHidePhone } from './features/hidePhone';
import { enable as enableReplaceMax, disable as disableReplaceMax, apply as applyReplaceMax } from './features/replaceMax';
import { enable as enableReplaceTitle, disable as disableReplaceTitle, apply as applyReplaceTitle } from './features/replaceTitle';
import { enable as enableLogView, disable as disableLogView, apply as applyLogView } from './features/logView';
import { enable as enableChatTags, disable as disableChatTags, apply as applyChatTags } from './features/chatTags';
import { enable as enableTemplates, disable as disableTemplates, apply as applyTemplates } from './features/templates';

export interface Feature {
    key: string;
    default: boolean;
    label: string;
    section: 'general' | 'security' | 'appearance' | 'media' | 'other' | 'chats'; // ← ДОБАВЛЯЕМ 'chats'
    apply: () => void;
    enable: () => void;
    disable: () => void;
    lazy?: boolean;
}

export const FEATURES: Record<string, Feature> = {
    hideStories: {
        key: 'hideStories',
        default: false,
        label: 'hideStoriesLabel',
        section: 'general',
        apply: applyHideStories,
        enable: enableHideStories,
        disable: disableHideStories,
        lazy: true,
    },
    logView: {
        key: 'logView',
        default: false,
        label: 'logViewLabel',
        section: 'other',
        apply: applyLogView,
        enable: enableLogView,
        disable: disableLogView,
        lazy: true,
    },
    hideSferum: {
        key: 'hideSferum',
        default: false,
        label: 'hideSferumLabel',
        section: 'general',
        apply: applyHideSferum,
        enable: enableHideSferum,
        disable: disableHideSferum,
        lazy: true,
    },
    blockAnalytics: {
        key: 'blockAnalytics',
        default: false,
        label: 'blockAnalyticsLabel',
        section: 'security',
        apply: enableAnalytics,
        enable: enableAnalytics,
        disable: disableAnalytics,
        lazy: false,
    },
    hidePhone: {
        key: 'hidePhone',
        default: false,
        label: 'hidePhoneLabel',
        section: 'security',
        apply: applyHidePhone,
        enable: enableHidePhone,
        disable: disableHidePhone,
        lazy: true,
    },
    showCrown: {
        key: 'showCrown',
        default: false,
        label: 'showCrownLabel',
        section: 'appearance',
        apply: applyCrown,
        enable: enableCrown,
        disable: disableCrown,
        lazy: true,
    },
    replaceTitle: {
        key: 'replaceTitle',
        default: false,
        label: 'replaceTitleLabel',
        section: 'appearance',
        apply: applyReplaceTitle,
        enable: enableReplaceTitle,
        disable: disableReplaceTitle,
        lazy: false,
    },
    showMetadata: {
        key: 'showMetadata',
        default: false,
        label: 'showMetadataLabel',
        section: 'media',
        apply: applyMetadata,
        enable: enableMetadata,
        disable: disableMetadata,
        lazy: true,
    },
    replaceMax: {
        key: 'replaceMax',
        default: false,
        label: 'replaceMaxLabel',
        section: 'other',
        apply: applyReplaceMax,
        enable: enableReplaceMax,
        disable: disableReplaceMax,
        lazy: true,
    },
    chatTags: {
        key: 'chatTags',
        default: false,
        label: 'chatTagsLabel',
        section: 'chats', // ← ИСПРАВЛЕНО: было 'other', стало 'chats'
        apply: applyChatTags,
        enable: enableChatTags,
        disable: disableChatTags,
        lazy: true,
    },
    templates: {
    key: 'templates',
    default: false,
    label: 'templatesLabel',
    section: 'chats',
    apply: applyTemplates,
    enable: enableTemplates,
    disable: disableTemplates,
    lazy: true,
},
};

// Кеш применённых фич
const appliedFeatures = new Set<string>();

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
        if (enabled && feature.enable) {
            try {
                feature.enable();
                appliedFeatures.add(key);
            } catch (e) {
                logger.error(`Failed to enable feature: ${key}`, e);
            }
        } else if (!enabled && feature.disable) {
            if (appliedFeatures.has(key)) {
                try {
                    feature.disable();
                    appliedFeatures.delete(key);
                } catch (e) {
                    logger.error(`Failed to disable feature: ${key}`, e);
                }
            }
        }
    }
}

export function applyFeature(key: string): void {
    const feature = FEATURES[key];
    if (!feature) return;

    const enabled = storage.getBoolean(key as any);
    if (enabled && feature.enable) {
        if (!appliedFeatures.has(key)) {
            try {
                feature.enable();
                appliedFeatures.add(key);
            } catch (e) {
                logger.error(`Failed to enable feature: ${key}`, e);
            }
        }
    } else if (!enabled && feature.disable) {
        if (appliedFeatures.has(key)) {
            try {
                feature.disable();
                appliedFeatures.delete(key);
            } catch (e) {
                logger.error(`Failed to disable feature: ${key}`, e);
            }
        }
    }
}

export function toggleFeature(key: string): boolean {
    const feature = FEATURES[key];
    if (!feature) {
        logger.warn(`Feature not found: ${key}`);
        return false;
    }

    const current = storage.getBoolean(key as any);
    const newState = !current;
    storage.setBoolean(key as any, newState);

    if (newState && feature.enable) {
        try {
            feature.enable();
            appliedFeatures.add(key);
        } catch (e) {
            logger.error(`Failed to enable feature: ${key}`, e);
        }
    } else if (!newState && feature.disable) {
        try {
            feature.disable();
            appliedFeatures.delete(key);
        } catch (e) {
            logger.error(`Failed to disable feature: ${key}`, e);
        }
    }

    return newState;
}

export function isFeatureEnabled(key: string): boolean {
    return storage.getBoolean(key as any);
}

window.addEventListener('beforeunload', () => {
    appliedFeatures.clear();
});