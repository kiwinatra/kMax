/*
* @author: potemk.in
* @brief: Marks beta tester names with the site's native verification mini icon.
* @desc: The icon must live INSIDE <span class="name svelte-1riu5uh">, as a
*       sibling of <span class="text"> — that's exactly how MAX itself renders
*       native verification badges, so vertical alignment and spacing come
*       from the site's own flex layout, not from our styles.
*
*       Batch-aware: runs on every batch (no selector filter in registry),
*       handles added nodes and characterData, and re-inserts the icon if
*       Svelte re-renders the name node and drops our child.
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

/** Wrapper that also carries the native `.icon` sibling. */
const NAME_WRAPPER_SELECTORS = [
    'span.name.svelte-1riu5uh',
    'span.name',
];

/** The element whose textContent is the actual nickname. */
const NAME_TEXT_SELECTORS = [
    OFFSETS.classes.name,          // 'span.text.svelte-1riu5uh'
    'span.text.svelte-1riu5uh',
    '.text.svelte-1riu5uh',
];

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

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
// LOOKUP HELPERS
// ============================================================

/** Given any element, find the wrapping <span class="name"> it belongs to. */
function findNameWrapper(el: Element): HTMLElement | null {
    // el may be the .name itself
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try {
            if (el.matches(sel)) return el as HTMLElement;
        } catch { /* ignore */ }
    }
    // or an ancestor of .text
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try {
            const wrapper = el.closest(sel);
            if (wrapper) return wrapper as HTMLElement;
        } catch { /* ignore */ }
    }
    return null;
}

/** Extract the nickname text from a .name wrapper. */
function getNameText(nameWrapper: HTMLElement): string {
    for (const sel of NAME_TEXT_SELECTORS) {
        const textEl = nameWrapper.querySelector(sel);
        if (textEl) {
            // strip out any child icons just in case
            return (textEl.textContent || '').trim();
        }
    }
    return (nameWrapper.textContent || '').trim();
}

// ============================================================
// SYNC ONE WRAPPER
// ============================================================

/**
 * Ensure <span class="name"> has our verification icon iff the name
 * matches a beta tester. Returns true if DOM was changed.
 */
function syncWrapper(nameWrapper: HTMLElement): boolean {
    const name = getNameText(nameWrapper);
    if (!name) return false;

    const isBeta = isBetaTester(name);
    const hasIcon = !!nameWrapper.querySelector(`.${ICON_CLASS}`);
    const marked = nameWrapper.dataset[MARK_ATTR] === 'true';

    if (!isBeta) {
        if (hasIcon || marked) {
            nameWrapper.querySelectorAll(`.${ICON_CLASS}`).forEach((n) => n.remove());
            delete nameWrapper.dataset[MARK_ATTR];
            return true;
        }
        return false;
    }

    if (hasIcon) {
        if (!marked) nameWrapper.dataset[MARK_ATTR] = 'true';
        return false;
    }

    // Append as sibling of .text inside .name — same position MAX uses
    // for native verification badges. Flex layout of .name handles alignment.
    nameWrapper.appendChild(createVerificationIcon());
    nameWrapper.dataset[MARK_ATTR] = 'true';
    return true;
}

// ============================================================
// BATCH PROCESSING
// ============================================================

const COMBINED_TEXT_SELECTOR = NAME_TEXT_SELECTORS.join(',');
const COMBINED_WRAPPER_SELECTOR = NAME_WRAPPER_SELECTORS.join(',');

function processBatch(batch?: ObserverBatch): number {
    let processed = 0;
    const seen = new WeakSet<HTMLElement>();

    const handleWrapper = (wrapper: HTMLElement): void => {
        if (seen.has(wrapper)) return;
        seen.add(wrapper);
        if (syncWrapper(wrapper)) processed++;
    };

    if (batch) {
        // 1) Added nodes
        for (const node of batch.addedNodes) {
            if (!(node instanceof Element)) continue;

            // The added node itself might be .text or .name
            const wrapperFromSelf = findNameWrapper(node);
            if (wrapperFromSelf) handleWrapper(wrapperFromSelf);

            // Descendants that are .text / .name
            node.querySelectorAll<HTMLElement>(COMBINED_TEXT_SELECTOR)
                .forEach((el) => {
                    const w = findNameWrapper(el);
                    if (w) handleWrapper(w);
                });
            node.querySelectorAll<HTMLElement>(COMBINED_WRAPPER_SELECTOR)
                .forEach(handleWrapper);
        }

        // 2) Character data changes (Svelte updates text in place)
        for (const node of batch.characterDataNodes) {
            const parent = node.parentElement;
            if (!parent) continue;
            if (!parent.matches(COMBINED_TEXT_SELECTOR)) continue;
            const wrapper = findNameWrapper(parent);
            if (wrapper) handleWrapper(wrapper);
        }
    } else {
        // Full scan
        for (const sel of NAME_WRAPPER_SELECTORS) {
            const wrappers = qsa<HTMLElement>(sel);
            for (const w of wrappers) handleWrapper(w);
        }
    }

    return processed;
}

// ============================================================
// REMOVE
// ============================================================

function removeAllMarks(): void {
    for (const sel of NAME_WRAPPER_SELECTORS) {
        const wrappers = qsa<HTMLElement>(sel);
        for (const w of wrappers) {
            const hadIcon = w.querySelector(`.${ICON_CLASS}`);
            const wasMarked = w.dataset[MARK_ATTR] === 'true';
            if (!hadIcon && !wasMarked) continue;
            w.querySelectorAll(`.${ICON_CLASS}`).forEach((n) => n.remove());
            delete w.dataset[MARK_ATTR];
        }
    }
}

// ============================================================
// PUBLIC API
// ============================================================

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