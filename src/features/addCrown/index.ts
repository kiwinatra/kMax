/*
* @author: potemk.in
* @brief: Highlights beta tester names with a golden style and 👑 emoji.
* @desc: Pure apply-based feature. No local observer or timers — the central registry triggers apply() only when matching nodes (span.text / .text.svelte-1riu5uh) appear in the DOM batch. Uses dataset flag to stay idempotent, and a small cache for beta-tester name lookups.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';

// ============================================================
// CONSTANTS
// ============================================================

const CROWN_EMOJI = '👑';
const GOLD_COLOR = '#ffd700';
const GOLD_SHADOW = '0 0 20px rgba(255, 215, 0, 0.4)';
const MAX_BETA_CACHE = 200;

const NAME_SELECTORS = [
    OFFSETS.classes.name,
    'span.text.svelte-1riu5uh',
    '.text.svelte-1riu5uh',
];

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

/** Cached lookups: trimmed lowercase name → is beta tester. */
const betaCache = new Map<string, boolean>();

// ============================================================
// BETA TESTER MATCHING
// ============================================================

function isBetaTester(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;

    const cached = betaCache.get(trimmed);
    if (cached !== undefined) return cached;

    const result = OFFSETS.betaTesters.some((tester) => {
        const t = tester.trim().toLowerCase();
        return trimmed === t || trimmed.includes(t) || t.includes(trimmed);
    });

    if (betaCache.size >= MAX_BETA_CACHE) betaCache.clear();
    betaCache.set(trimmed, result);
    return result;
}

// ============================================================
// DOM PROCESSING
// ============================================================

function findNameElements(): Element[] {
    for (const selector of NAME_SELECTORS) {
        const elements = qsa(selector);
        if (elements.length > 0) return elements;
    }
    return [];
}

function applyCrownToElement(element: HTMLElement): boolean {
    if (element.dataset.kmodCrown === 'true') return false;

    const name = element.textContent?.trim() || '';
    if (!name || !isBetaTester(name)) return false;

    element.dataset.kmodCrown = 'true';
    element.style.color = GOLD_COLOR;
    element.style.fontWeight = '700';
    element.style.textShadow = GOLD_SHADOW;

    if (!element.textContent?.includes(CROWN_EMOJI)) {
        element.textContent += ` ${CROWN_EMOJI}`;
    }
    return true;
}

function processPage(): void {
    if (!isEnabled) return;
    if (!storage.getBoolean('showCrown')) return;

    const elements = findNameElements();
    if (elements.length === 0) return;

    let processed = 0;
    for (const el of elements) {
        if (applyCrownToElement(el as HTMLElement)) processed++;
    }

    if (processed > 0) {
        logger.debug(`👑 Applied ${processed} crowns`);
    }
}

function removeAllCrowns(): void {
    const elements = findNameElements();
    let removed = 0;
    for (const el of elements) {
        const e = el as HTMLElement;
        if (e.dataset.kmodCrown !== 'true') continue;

        e.style.color = '';
        e.style.fontWeight = '';
        e.style.textShadow = '';
        if (e.textContent) {
            e.textContent = e.textContent
                .replace(` ${CROWN_EMOJI}`, '')
                .replace(CROWN_EMOJI, '');
        }
        delete e.dataset.kmodCrown;
        removed++;
    }
    if (removed > 0) {
        logger.debug(`👑 Removed ${removed} crowns`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Full scan (idempotent). Called by registry on init, on toggles, and on DOM batches. */
export function apply(): void {
    processPage();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('👑 Crown enabled');
    processPage();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    removeAllCrowns();
    betaCache.clear();
    logger.info('👑 Crown disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('showCrown');
    storage.setBoolean('showCrown', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}