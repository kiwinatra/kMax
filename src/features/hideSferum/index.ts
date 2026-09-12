/*
* @author: potemk.in
* @brief: Hides the "Sign in to Sferum" button in the sidebar.
* @desc: Uses display:none instead of node removal — fully idempotent and reversible without storing DOM positions. Registry triggers apply() when `.item` nodes appear. No local observer, no timers, no hidden-button map.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';

// ============================================================
// CONSTANTS
// ============================================================

const SFERUM_BUTTON_SELECTOR = '.item.svelte-6bkz6t';
const SFERUM_FALLBACK_SELECTOR = '.item';
const SFERUM_TEXT = 'Войти в Cферум';

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

// ============================================================
// DETECTION
// ============================================================

function isSferumButton(el: Element): boolean {
    const text = el.textContent?.trim() || '';
    if (text.includes(SFERUM_TEXT)) return true;

    const spans = el.querySelectorAll('span');
    for (const span of spans) {
        if (span.textContent?.trim().includes(SFERUM_TEXT)) {
            return true;
        }
    }
    return false;
}

function findSferumButtons(): HTMLElement[] {
    let candidates = qsa<HTMLElement>(SFERUM_BUTTON_SELECTOR);
    if (candidates.length === 0) {
        candidates = qsa<HTMLElement>(SFERUM_FALLBACK_SELECTOR);
    }
    return candidates.filter(isSferumButton);
}

// ============================================================
// DOM PROCESSING
// ============================================================

function hideAll(): void {
    const buttons = findSferumButtons();
    let count = 0;
    for (const btn of buttons) {
        if (btn.style.display !== 'none') {
            btn.style.display = 'none';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`🧹 Hidden ${count} Sferum button(s)`);
    }
}

function showAll(): void {
    const buttons = findSferumButtons();
    let count = 0;
    for (const btn of buttons) {
        if (btn.style.display === 'none') {
            btn.style.display = '';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`♻️ Restored ${count} Sferum button(s)`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — syncs visibility with current storage flag. */
export function apply(): void {
    if (storage.getBoolean('hideSferum')) {
        hideAll();
    } else {
        showAll();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('🧹 Sferum button hide enabled');
    hideAll();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    showAll();
    logger.info('🧹 Sferum button hide disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('hideSferum');
    storage.setBoolean('hideSferum', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}