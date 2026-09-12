/*
* @author: potemk.in
* @brief: Hides the user's phone number in the profile.
* @desc: Pure apply-based feature. Registry triggers apply() when `.phone` nodes appear in the DOM batch. Idempotent — toggling display is a no-op if state already matches storage flag. No local observer, no timers.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';

// ============================================================
// CONSTANTS
// ============================================================

const PHONE_SELECTOR = '.phone.svelte-6bkz6t';
const FALLBACK_SELECTOR = '.phone';

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

// ============================================================
// DOM PROCESSING
// ============================================================

function getPhoneElements(): HTMLElement[] {
    let elements = qsa<HTMLElement>(PHONE_SELECTOR);
    if (elements.length === 0) {
        elements = qsa<HTMLElement>(FALLBACK_SELECTOR);
    }
    return elements;
}

function hideAll(): void {
    const elements = getPhoneElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📱 Hidden ${count} phone element(s)`);
    }
}

function showAll(): void {
    const elements = getPhoneElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display === 'none') {
            el.style.display = '';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📱 Shown ${count} phone element(s)`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — syncs display state with current storage flag. */
export function apply(): void {
    if (storage.getBoolean('hidePhone')) {
        hideAll();
    } else {
        showAll();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('📱 Phone hide enabled');
    hideAll();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    showAll();
    logger.info('📱 Phone hide disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('hidePhone');
    storage.setBoolean('hidePhone', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}