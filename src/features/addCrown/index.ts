/*
* @author: potemk.in
* @brief: Marks beta tester names with the site's native verification mini icon.
* @desc: Pure apply-based feature, batch-aware. Because Svelte may replace
*       only the text inside an existing name node (or re-create the icon
*       node during re-render), we:
*         1) run on every batch (no selector filter in registry),
*         2) process characterData nodes as well as added nodes,
*         3) re-check icon presence even when dataset flag is set.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { ObserverBatch } from '../../core/observer';

// ============================================================
// CONSTANTS
// ============================================================

const MARK_ATTR = 'kmodCrown';
const ICON_CLASS = 'kmod-verified';
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
// ICON
// ============================================================

function createVerificationIcon(): HTMLElement {
    const i = document.createElement('i');
    i.className = `icon svelte-i2tuez ${ICON_CLASS}`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon_verification_mini_themed');

    svg.appendChild(use);
    i.appendChild(svg);
    return i;
}

// ============================================================
// DOM PROCESSING
// ============================================================

function findNameElements(): HTMLElement[] {
    for (const selector of NAME_SELECTORS) {
        const elements = qsa<HTMLElement>(selector);
        if (elements.length > 0) return elements;
    }
    return [];
}

/**
 * Sync one name element with the desired state.
 * Returns true if we did something (add / re-add icon).
 */
function syncElement(element: HTMLElement): boolean {
    const name = element.textContent?.trim() || '';
    if (!name) return false;

    const isBeta = isBetaTester(name);
    const hasIcon = !!element.querySelector(`.${ICON_CLASS}`);
    const marked = element.dataset[MARK_ATTR] === 'true';

    // Not a beta tester → ensure no leftover icon / flag
    if (!isBeta) {
        if (hasIcon || marked) {
            element.querySelectorAll(`.${ICON_CLASS}`).forEach((n) => n.remove());
            delete element.dataset[MARK_ATTR];
            return true;
        }
        return false;
    }

    // Is a beta tester and icon is present → nothing to do
    if (hasIcon) {
        if (!marked) element.dataset[MARK_ATTR] = 'true';
        return false;
    }

    // Is a beta tester but icon is missing → (re)insert
    element.appendChild(createVerificationIcon());
    element.dataset[MARK_ATTR] = 'true';
    return true;
}

function processBatch(batch?: ObserverBatch): number {
    let processed = 0;

    if (batch) {
        // 1. Added nodes: check the node itself + its descendants
        for (const node of batch.addedNodes) {
            if (node instanceof Element) {
                if (node.matches(NAME_SELECTORS.join(','))) {
                    if (syncElement(node as HTMLElement)) processed++;
                }
                const descendants = node.querySelectorAll<HTMLElement>(
                    NAME_SELECTORS.join(',')
                );
                for (const el of descendants) {
                    if (syncElement(el)) processed++;
                }
            }
        }

        // 2. Character-data changes: the parent may be a name node
        for (const node of batch.characterDataNodes) {
            const parent = node.parentElement;
            if (parent && parent.matches(NAME_SELECTORS.join(','))) {
                if (syncElement(parent)) processed++;
            }
        }
    } else {
        // Full scan
        for (const el of findNameElements()) {
            if (syncElement(el)) processed++;
        }
    }

    return processed;
}

function removeAllMarks(): void {
    const elements = findNameElements();
    let removed = 0;
    for (const el of elements) {
        const hadIcon = el.querySelector(`.${ICON_CLASS}`);
        const wasMarked = el.dataset[MARK_ATTR] === 'true';
        if (!hadIcon && !wasMarked) continue;

        el.querySelectorAll(`.${ICON_CLASS}`).forEach((n) => n.remove());
        delete el.dataset[MARK_ATTR];
        removed++;
    }
    if (removed > 0) {
        logger.debug(`✅ Removed ${removed} verification icons`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Batch-aware: if a batch is provided, only process changed/added nodes.
 * Otherwise fall back to a full scan (used on enable / manual apply).
 */
export function apply(batch?: ObserverBatch): void {
    if (!storage.getBoolean('showCrown')) {
        removeAllMarks();
        return;
    }

    const processed = processBatch(batch);
    if (processed > 0) {
        logger.debug(`✅ Applied ${processed} verification icon(s)`);
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('✅ Verification icon enabled');
    apply();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    removeAllMarks();
    betaCache.clear();
    logger.info('✅ Verification icon disabled');
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