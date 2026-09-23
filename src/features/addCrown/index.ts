/*
* @author: potemk.in
* @brief: Marks beta tester names with the site's native verification mini icon.
* @desc: The icon is appended INSIDE <span class="name svelte-1riu5uh">, as a
*       sibling of <span class="text"> — exactly how MAX renders native
*       verification badges, so alignment comes from the site's own flex.
*
*       Batch-aware. Handles THREE insertion paths Svelte uses:
*         1) whole <span class="name"> subtree added at once (querySelectorAll),
*         2) plain text node inserted into an existing .text (addedNodes has
*            a Text node, not an Element — this was the bug),
*         3) characterData change inside .text.
*
*       Runs on every batch (registry: no selectors for this feature).
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

const NAME_WRAPPER_SELECTORS = [
    'span.name.svelte-1riu5uh',
    'span.name',
];

const NAME_TEXT_SELECTORS = [
    OFFSETS.classes.name,          // 'span.text.svelte-1riu5uh'
    'span.text.svelte-1riu5uh',
    '.text.svelte-1riu5uh',
    'span.text',
];

const COMBINED_TEXT_SELECTOR = NAME_TEXT_SELECTORS.join(',');
const COMBINED_WRAPPER_SELECTOR = NAME_WRAPPER_SELECTORS.join(',');

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
const betaCache = new Map<string, boolean>();

// ============================================================
// NORMALIZATION
// ============================================================

function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, ' ')
        .trim();
}

function isBetaTester(name: string): boolean {
    const trimmed = normalizeName(name);
    if (!trimmed) return false;

    const cached = betaCache.get(trimmed);
    if (cached !== undefined) return cached;

    const result = OFFSETS.betaTesters.some((tester) => {
        const t = normalizeName(tester);
        if (!t) return false;
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
// LOOKUP
// ============================================================

function findNameWrapper(el: Element | null): HTMLElement | null {
    if (!el) return null;
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try { if (el.matches(sel)) return el as HTMLElement; } catch {}
    }
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try {
            const w = el.closest(sel);
            if (w) return w as HTMLElement;
        } catch {}
    }
    return null;
}

function getNameText(nameWrapper: HTMLElement): string {
    for (const sel of NAME_TEXT_SELECTORS) {
        const textEl = nameWrapper.querySelector(sel);
        if (textEl) {
            const t = (textEl.textContent || '').trim();
            if (t) return t;
        }
    }
    return (nameWrapper.textContent || '').trim();
}

// ============================================================
// SYNC
// ============================================================

function syncWrapper(nameWrapper: HTMLElement): boolean {
    const name = getNameText(nameWrapper);
    if (!name) return false;

    const isBeta = isBetaTester(name);
    const ourIcon = nameWrapper.querySelector('.' + ICON_CLASS);
    const marked = nameWrapper.dataset[MARK_ATTR] === 'true';

    // Not a beta tester → clean our leftovers
    if (!isBeta) {
        if (ourIcon || marked) {
            nameWrapper.querySelectorAll('.' + ICON_CLASS).forEach((n) => n.remove());
            delete nameWrapper.dataset[MARK_ATTR];
            return true;
        }
        return false;
    }

    // Beta tester, icon already present → just ensure the flag
    if (ourIcon) {
        if (!marked) nameWrapper.dataset[MARK_ATTR] = 'true';
        return false;
    }

    // Don't duplicate a native MAX badge if MAX already drew one.
    // Native badge: .icon.svelte-i2tuez that is NOT ours.
    const nativeIcon = nameWrapper.querySelector(
        'i.icon.svelte-i2tuez:not(.' + ICON_CLASS + ')'
    );
    if (nativeIcon) {
        if (!marked) nameWrapper.dataset[MARK_ATTR] = 'true';
        return false;
    }

    // Insert ours
    nameWrapper.appendChild(createVerificationIcon());
    nameWrapper.dataset[MARK_ATTR] = 'true';
    return true;
}

// ============================================================
// BATCH
// ============================================================

function processBatch(batch?: ObserverBatch): number {
    let processed = 0;
    const seen = new WeakSet<HTMLElement>();

    const handle = (wrapper: HTMLElement | null): void => {
        if (!wrapper || seen.has(wrapper)) return;
        seen.add(wrapper);
        if (syncWrapper(wrapper)) processed++;
    };

    if (batch) {
        // --- 1. Added nodes (Element OR Text) ---
        for (const node of batch.addedNodes) {
            if (node instanceof Element) {
                // The added element itself might be .name
                handle(findNameWrapper(node));

                // Any .text descendants → their .name parent
                node.querySelectorAll<HTMLElement>(COMBINED_TEXT_SELECTOR)
                    .forEach((el) => handle(findNameWrapper(el)));

                // Any .name descendants
                node.querySelectorAll<HTMLElement>(COMBINED_WRAPPER_SELECTOR)
                    .forEach(handle);
            } else if (node.nodeType === Node.TEXT_NODE) {
                // *** THE FIX ***
                // Svelte often inserts the nickname as a bare Text node
                // inside an existing .text. Without this branch we never
                // see it and never mark the wrapper.
                const parent = (node as Text).parentElement;
                if (parent && parent.matches(COMBINED_TEXT_SELECTOR)) {
                    handle(findNameWrapper(parent));
                }
            }
        }

        // --- 2. characterData changes (Svelte sets textContent in place) ---
        for (const node of batch.characterDataNodes) {
            const parent = (node as Node).parentElement;
            if (!parent) continue;
            if (!parent.matches(COMBINED_TEXT_SELECTOR)) continue;
            handle(findNameWrapper(parent));
        }

        // --- 3. Attribute changes (class flips are common during re-render) ---
        for (const el of batch.attributeNodes) {
            if (!(el instanceof Element)) continue;
            if (el.matches(COMBINED_TEXT_SELECTOR)) {
                handle(findNameWrapper(el));
            } else if (el.matches(COMBINED_WRAPPER_SELECTOR)) {
                handle(el as HTMLElement);
            }
        }
    } else {
        // Full scan
        for (const sel of NAME_WRAPPER_SELECTORS) {
            qsa<HTMLElement>(sel).forEach(handle);
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
            const ourIcon = w.querySelector('.' + ICON_CLASS);
            const marked = w.dataset[MARK_ATTR] === 'true';
            if (!ourIcon && !marked) continue;
            w.querySelectorAll('.' + ICON_CLASS).forEach((n) => n.remove());
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