/*
* @author: potemk.in
* @brief: Hides the stories block in the feed.
* @desc: Pure apply-based feature. Registry triggers apply() when `.storiesStack` nodes appear in the DOM batch. Idempotent — toggling display is a no-op if state already matches storage flag. No local observer, no timers, no element cache.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';

// ============================================================
// CONSTANTS
// ============================================================

const STORIES_SELECTOR = '.storiesStack.svelte-1rr6jx2';
const FALLBACK_SELECTOR = '.storiesStack';

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

// ============================================================
// DOM PROCESSING
// ============================================================

function getStoriesElements(): HTMLElement[] {
    let elements = qsa<HTMLElement>(STORIES_SELECTOR);
    if (elements.length === 0) {
        elements = qsa<HTMLElement>(FALLBACK_SELECTOR);
    }
    return elements;
}

function hideAll(): void {
    const elements = getStoriesElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📚 Hidden ${count} stories`);
    }
}

function showAll(): void {
    const elements = getStoriesElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display === 'none') {
            el.style.display = '';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📚 Shown ${count} stories`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — syncs display state with current storage flag. */
export function apply(): void {
    if (storage.getBoolean('hideStories')) {
        hideAll();
    } else {
        showAll();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('📚 Stories hide enabled');
    hideAll();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    showAll();
    logger.info('📚 Stories hide disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('hideStories');
    storage.setBoolean('hideStories', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}