/*
* @author: potemk.in
* @brief: Central feature registry — state, enabling, disabling, and batch-driven DOM application.
* @desc: Manages all features with a cached Set of enabled keys, so DOM mutations only invoke features that are actually on. Each feature declares optional CSS selectors; when the centralized observer reports added nodes, only matching features are triggered. Features may also receive the raw ObserverBatch to process only what changed. Storage reads are minimized by keeping an in-memory enabled set synchronized with storage.
*/

import { storage } from './core/storage';
import { logger } from './core/logger';
import { ObserverBatch } from './core/observer';

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
    /** Called on init, on toggle, and on every matching DOM batch. */
    apply: (batch?: ObserverBatch) => void;
    enable: () => void;
    disable: () => void;
    lazy?: boolean;
    /**
     * Optional CSS selectors. If provided, `apply` is only triggered when
     * the centralized observer reports added nodes matching any of them.
     * If omitted, `apply` runs on every batch.
     */
    selectors?: string[];
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
        selectors: ['.storiesStack'],
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
        selectors: ['.item.svelte-6bkz6t', '.item'],
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
        selectors: ['.phone'],
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
        selectors: ['span.text', '.text.svelte-1riu5uh'],
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
        selectors: ['div.actions.svelte-2k9gk6', 'img'],
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
        // No selectors — replaceMax needs every characterData mutation,
        // and it receives the raw batch to filter internally.
    },
    chatTags: {
        key: 'chatTags',
        default: false,
        label: 'chatTagsLabel',
        section: 'chats',
        apply: applyChatTags,
        enable: enableChatTags,
        disable: disableChatTags,
        lazy: true,
        selectors: ['.wrapper.svelte-q2jdqb', '.cell.svelte-q2jdqb'],
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
        selectors: ['.contenteditable.svelte-1k31az8', '[contenteditable="true"]'],
    },
};

// ============================================================
// ENABLED SET
// ============================================================

const enabledFeatures = new Set<string>();
let enabledSetInitialized = false;

/**
 * Storage key → boolean resolver.
 * Some features (chatTags, templates) store an object with an `enabled` field,
 * so a plain storage.getBoolean won't return the correct state.
 */
function resolveFeatureEnabled(key: string): boolean {
    if (key === 'chatTags') {
        const data = storage.get<{ enabled?: boolean }>('chatTags');
        return !!(data && data.enabled);
    }
    if (key === 'templates') {
        const data = storage.get<{ enabled?: boolean }>('templates');
        return !!(data && data.enabled);
    }
    return storage.getBoolean(key as any);
}

function syncEnabledSet(): void {
    enabledFeatures.clear();
    for (const key of Object.keys(FEATURES)) {
        if (resolveFeatureEnabled(key)) {
            enabledFeatures.add(key);
        }
    }
    enabledSetInitialized = true;
}

function ensureEnabledSet(): void {
    if (!enabledSetInitialized) syncEnabledSet();
}

// ============================================================
// LOOKUPS
// ============================================================

export function getFeatureKeys(): string[] {
    return Object.keys(FEATURES);
}

export function getFeature(key: string): Feature | undefined {
    return FEATURES[key];
}

export function getFeaturesBySection(section: string): [string, Feature][] {
    return Object.entries(FEATURES).filter(([, f]) => f.section === section);
}

// ============================================================
// APPLY
// ============================================================

/** Enable/disable all features according to storage. Called once on init. */
export function applyAllFeatures(): void {
    syncEnabledSet();

    for (const [key, feature] of Object.entries(FEATURES)) {
        const shouldBeOn = enabledFeatures.has(key);
        if (shouldBeOn) {
            try {
                feature.enable();
            } catch (e) {
                logger.error(`Failed to enable feature: ${key}`, e);
                enabledFeatures.delete(key);
            }
        } else {
            try {
                feature.disable();
            } catch (e) {
                logger.error(`Failed to disable feature: ${key}`, e);
            }
        }
    }
}

/** Apply a single feature based on current state. */
export function applyFeature(key: string): void {
    const feature = FEATURES[key];
    if (!feature) return;

    ensureEnabledSet();
    const shouldBeOn = resolveFeatureEnabled(key);

    if (shouldBeOn && !enabledFeatures.has(key)) {
        try {
            feature.enable();
            enabledFeatures.add(key);
        } catch (e) {
            logger.error(`Failed to enable feature: ${key}`, e);
        }
    } else if (!shouldBeOn && enabledFeatures.has(key)) {
        try {
            feature.disable();
            enabledFeatures.delete(key);
        } catch (e) {
            logger.error(`Failed to disable feature: ${key}`, e);
        }
    } else if (shouldBeOn) {
        try {
            feature.apply();
        } catch (e) {
            logger.error(`Failed to apply feature: ${key}`, e);
        }
    }
}

/**
 * Called by the centralized observer with a batched set of DOM changes.
 * Only enabled features are considered. Features with `selectors` run only
 * when a matching added node is present. Features without selectors run on
 * every batch (they can filter further via the passed ObserverBatch).
 */
export function applyOnMutations(batch: ObserverBatch): void {
    ensureEnabledSet();
    if (enabledFeatures.size === 0) return;

    const added = batch.addedNodes;

    for (const key of enabledFeatures) {
        const feature = FEATURES[key];
        if (!feature) continue;

        if (feature.selectors && feature.selectors.length > 0) {
            if (!matchesAnySelector(added, feature.selectors)) continue;
        }

        try {
            feature.apply(batch);
        } catch (e) {
            logger.error(`Failed to apply feature "${key}" on mutation:`, e);
        }
    }
}

function matchesAnySelector(nodes: Node[], selectors: string[]): boolean {
    if (nodes.length === 0) return false;

    for (const node of nodes) {
        if (!(node instanceof Element)) {
            const parent = node.parentElement;
            if (parent) {
                for (const sel of selectors) {
                    try {
                        if (parent.matches(sel)) return true;
                    } catch {}
                }
            }
            continue;
        }

        for (const sel of selectors) {
            try {
                if (node.matches(sel) || node.querySelector(sel)) return true;
            } catch {}
        }
    }
    return false;
}

// ============================================================
// TOGGLE / QUERY
// ============================================================

export function toggleFeature(key: string): boolean {
    const feature = FEATURES[key];
    if (!feature) {
        logger.warn(`Feature not found: ${key}`);
        return false;
    }

    ensureEnabledSet();
    const current = enabledFeatures.has(key);
    const newState = !current;

    // Non-boolean features (chatTags, templates) handle their own storage.
    if (key !== 'chatTags' && key !== 'templates') {
        storage.setBoolean(key as any, newState);
    }

    if (newState) {
        try {
            feature.enable();
            enabledFeatures.add(key);
        } catch (e) {
            logger.error(`Failed to enable feature: ${key}`, e);
            if (key !== 'chatTags' && key !== 'templates') {
                storage.setBoolean(key as any, false);
            }
            return false;
        }
    } else {
        try {
            feature.disable();
            enabledFeatures.delete(key);
        } catch (e) {
            logger.error(`Failed to disable feature: ${key}`, e);
        }
    }

    return newState;
}

export function isFeatureEnabled(key: string): boolean {
    ensureEnabledSet();
    return enabledFeatures.has(key);
}

/**
 * Force-rebuild the enabled set from storage (e.g. after a bulk reset).
 */
export function invalidateEnabledCache(): void {
    enabledSetInitialized = false;
    enabledFeatures.clear();
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        enabledFeatures.clear();
        enabledSetInitialized = false;
    });
}