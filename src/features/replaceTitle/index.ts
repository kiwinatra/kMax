/*
* @author: potemk.in
* @brief: Adds the "kMax | " prefix to the document title.
* @desc: Uses a dedicated MutationObserver on <title> because the centralized
*       observer only watches <body>. A change to document.title happens in
*       <head>, so it would be missed otherwise. This is the single documented
*       exception to the "one observer" rule — the target is a single, tiny
*       node, and the cost is negligible. All other logic is pure/idempotent
*       and callable from registry.apply() at any time.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';

// ============================================================
// CONSTANTS
// ============================================================

const PREFIX = 'kMax | ';
const FALLBACK_TITLE = 'max.ru';
const DATASET_KEY = 'kmodOriginalTitle';

// ============================================================
// STATE
// ============================================================

let titleObserver: MutationObserver | null = null;
let applyDebounceTimer: number | null = null;

// ============================================================
// ORIGINAL TITLE BOOKKEEPING
// ============================================================

function getStoredOriginalTitle(): string | null {
    return document.documentElement.dataset[DATASET_KEY] || null;
}

function storeOriginalTitle(title: string): void {
    document.documentElement.dataset[DATASET_KEY] = title;
}

function hasPrefix(): boolean {
    return document.title.startsWith(PREFIX);
}

function safeSetTitle(newTitle: string): void {
    if (document.title !== newTitle) {
        document.title = newTitle;
    }
}

// ============================================================
// CORE APPLY / RESTORE
// ============================================================

function applyTitle(): void {
    if (hasPrefix()) return;

    let original = getStoredOriginalTitle();
    if (!original) {
        original = document.title;
        storeOriginalTitle(original);
    }

    // Guard against duplicated prefixes from prior sessions
    if (original.startsWith(PREFIX)) {
        original = original.slice(PREFIX.length);
        storeOriginalTitle(original);
    }

    safeSetTitle(`${PREFIX}${original}`);
}

function restoreTitle(): void {
    if (!hasPrefix()) return;

    let original = getStoredOriginalTitle();
    if (!original) {
        original = document.title.slice(PREFIX.length);
    }
    if (!original) {
        original = FALLBACK_TITLE;
    }

    safeSetTitle(original);
}

// ============================================================
// TITLE OBSERVER (single-purpose, documented exception)
// ============================================================

function scheduleTitleSync(): void {
    if (applyDebounceTimer !== null) {
        clearTimeout(applyDebounceTimer);
    }
    applyDebounceTimer = window.setTimeout(() => {
        applyDebounceTimer = null;
        if (!storage.getBoolean('replaceTitle')) return;
        if (!hasPrefix()) applyTitle();
    }, 50);
}

function startTitleObserver(): void {
    if (titleObserver) return;

    const titleEl = document.querySelector('head > title');
    if (!titleEl) return;

    titleObserver = new MutationObserver(scheduleTitleSync);
    titleObserver.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
    });

    logger.debug('📝 Title observer started');
}

function stopTitleObserver(): void {
    if (titleObserver) {
        titleObserver.disconnect();
        titleObserver = null;
    }
    if (applyDebounceTimer !== null) {
        clearTimeout(applyDebounceTimer);
        applyDebounceTimer = null;
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — syncs document title with the storage flag. */
export function apply(): void {
    if (storage.getBoolean('replaceTitle')) {
        applyTitle();
        startTitleObserver();
    } else {
        restoreTitle();
        stopTitleObserver();
    }
}

export function enable(): void {
    applyTitle();
    startTitleObserver();
    logger.info('📝 Title prefix enabled');
}

export function disable(): void {
    restoreTitle();
    stopTitleObserver();
    logger.info('📝 Title prefix disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('replaceTitle');
    storage.setBoolean('replaceTitle', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return titleObserver !== null;
}

// ============================================================
// BOOTSTRAP + CLEANUP
// ============================================================

// Start observing as soon as <title> exists in the DOM.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (storage.getBoolean('replaceTitle')) startTitleObserver();
    }, { once: true });
} else if (storage.getBoolean('replaceTitle')) {
    startTitleObserver();
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        stopTitleObserver();
    });
}

export default {
    enable,
    disable,
    toggle,
    apply,
    startTitleObserver,
    stopTitleObserver,
};