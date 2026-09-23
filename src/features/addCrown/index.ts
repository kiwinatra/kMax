/*
* @author: potemk.in
* @brief: Badges for beta testers, developers, and bug hunters.
* @desc: Appends small icons next to the nickname inside <span class="name">.
*       Two render contexts exist in MAX:
*         - .name.svelte-1riu5uh  → display:flex
*         - .name.svelte-6bkz6t   → inline text + icon
*       All badges share a single injected stylesheet, so both contexts
*       look identical and stay vertically aligned.
*
*       ── HOW TO EDIT ROLES ──────────────────────────────────────
*       Fill ROLE_MAP below. Key   = nickname as it appears in DOM
*                                   (case / ё / spaces are normalized).
*       Value = array of roles: 'dev' | 'bug'.
*       'verified' is granted automatically to every OFFSETS.betaTesters
*       match — don't add it here.
*       ────────────────────────────────────────────────────────────
*
*       Batch-aware. Handles THREE insertion paths Svelte uses:
*         1) whole <span class="name"> subtree added at once,
*         2) plain Text node inserted into an existing .text,
*         3) characterData change inside .text / .name.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { ObserverBatch } from '../../core/observer';

// ============================================================
// ★ EDIT THIS SECTION TO MANAGE ROLES ★
// ============================================================

type Role = 'dev' | 'bug';

const ROLE_MAP: Record<string, Role[]> = {
    'потемкин александр': ['dev'],
    'тимофей борин':      ['bug'],
    'борин тимофей':      ['bug'],  // на случай обратного порядка
    'тимоха':             ['bug'],
};

// ============================================================
// CONSTANTS
// ============================================================

const MARK_ATTR = 'kmodCrown';
const BADGE_CLASS = 'kmod-badge';
const STYLE_ID = 'kmod-crown-styles';
const MAX_BETA_CACHE = 200;

type BadgeType = 'verified' | Role;

const NAME_WRAPPER_SELECTORS = [
    'span.name.svelte-1riu5uh',
    'span.name.svelte-6bkz6t',
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
// STYLES (injected once)
// ============================================================

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.${BADGE_CLASS} {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    margin-left: 4px;
    flex-shrink: 0;
    line-height: 0;
    width: 16px;
    height: 16px;
    position: relative;
    top: -0.08em;
}
.${BADGE_CLASS} svg {
    display: block;
    width: 16px;
    height: 16px;
}
.${BADGE_CLASS}-verified { color: inherit; }
.${BADGE_CLASS}-dev      { color: #a78bfa; }
.${BADGE_CLASS}-bug      { color: #fb923c; }
`;
    document.head.appendChild(style);
}

function removeStyles(): void {
    document.getElementById(STYLE_ID)?.remove();
}

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
// BADGE FACTORIES
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeRoot(type: BadgeType): HTMLElement {
    const i = document.createElement('i');
    i.className = `icon svelte-i2tuez ${BADGE_CLASS} ${BADGE_CLASS}-${type}`;
    i.dataset.kmodBadge = type;
    return i;
}

function makeSvg(viewBox: string): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    return svg;
}

/** Native MAX verification icon (uses the site's <use> sprite). */
function createVerifiedBadge(): HTMLElement {
    const i = makeRoot('verified');
    const svg = makeSvg('0 0 24 24');
    svg.removeAttribute('viewBox');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#icon_verification_mini_themed');
    svg.appendChild(use);
    i.appendChild(svg);
    return i;
}

/** Developer badge — `</>` glyph, purple. */
function createDevBadge(): HTMLElement {
    const i = makeRoot('dev');
    const svg = makeSvg('0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const paths = [
        'M5.5 5L2.5 8L5.5 11',
        'M10.5 5L13.5 8L10.5 11',
        'M9 3.5L7 12.5',
    ];
    for (const d of paths) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
    }
    i.appendChild(svg);
    return i;
}

/** Bug hunter badge — beetle glyph, orange. */
function createBugBadge(): HTMLElement {
    const i = makeRoot('bug');
    const svg = makeSvg('0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', '8');
    ellipse.setAttribute('cy', '9.5');
    ellipse.setAttribute('rx', '3');
    ellipse.setAttribute('ry', '3.5');
    svg.appendChild(ellipse);

    const paths = [
        'M8 6V3.5',
        'M6 3.5L7 5',
        'M10 3.5L9 5',
        'M5 8L2.5 7.5',
        'M5 10.5L2.5 11.5',
        'M11 8L13.5 7.5',
        'M11 10.5L13.5 11.5',
    ];
    for (const d of paths) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
    }
    i.appendChild(svg);
    return i;
}

function createBadge(type: BadgeType): HTMLElement {
    if (type === 'verified') return createVerifiedBadge();
    if (type === 'dev')      return createDevBadge();
    return createBugBadge();
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
    // .name.svelte-6bkz6t: nickname lives directly in .name, our <i>s
    // carry no text nodes, so textContent is exactly the nickname.
    return (nameWrapper.textContent || '').trim();
}

// ============================================================
// SYNC ONE WRAPPER
// ============================================================

/**
 * Make the DOM match the desired badge set:
 *   verified (if beta tester) + roles from ROLE_MAP.
 * Skips our 'verified' badge if MAX already drew a native one.
 * Returns true if the DOM was changed.
 */
function syncWrapper(nameWrapper: HTMLElement): boolean {
    const name = getNameText(nameWrapper);
    if (!name) return false;

    const normalized = normalizeName(name);
    const isBeta = isBetaTester(name);
    const roles: Role[] = isBeta ? (ROLE_MAP[normalized] || []) : [];

    const expected: BadgeType[] = [];
    if (isBeta) expected.push('verified');
    for (const r of roles) expected.push(r);

    // If MAX itself has a verification badge next to this name — don't
    // duplicate it with ours. Role badges still get added.
    const nativeIcon = nameWrapper.querySelector(
        'i.icon.svelte-i2tuez:not(.' + BADGE_CLASS + ')'
    );
    if (nativeIcon) {
        const i = expected.indexOf('verified');
        if (i >= 0) expected.splice(i, 1);
    }

    const presentList = Array.from(
        nameWrapper.querySelectorAll<HTMLElement>('.' + BADGE_CLASS)
    ).map((el) => el.dataset.kmodBadge || '');

    const needsRebuild =
        presentList.length !== expected.length ||
        presentList.some((t, i) => t !== expected[i]);

    if (!needsRebuild) return false;

    // Rebuild in canonical order.
    nameWrapper.querySelectorAll('.' + BADGE_CLASS).forEach((el) => el.remove());
    for (const t of expected) {
        nameWrapper.appendChild(createBadge(t));
    }

    if (expected.length > 0) {
        nameWrapper.dataset[MARK_ATTR] = 'true';
    } else {
        delete nameWrapper.dataset[MARK_ATTR];
    }
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
        for (const node of batch.addedNodes) {
            if (node instanceof Element) {
                handle(findNameWrapper(node));

                node.querySelectorAll<HTMLElement>(COMBINED_TEXT_SELECTOR)
                    .forEach((el) => handle(findNameWrapper(el)));

                node.querySelectorAll<HTMLElement>(COMBINED_WRAPPER_SELECTOR)
                    .forEach(handle);
            } else if (node.nodeType === Node.TEXT_NODE) {
                // Svelte inserts nickname as a bare Text node:
                //  - inside .text (svelte-1riu5uh)
                //  - or directly inside .name (svelte-6bkz6t)
                const parent = (node as Text).parentElement;
                if (!parent) continue;
                if (parent.matches(COMBINED_TEXT_SELECTOR)) {
                    handle(findNameWrapper(parent));
                } else if (parent.matches(COMBINED_WRAPPER_SELECTOR)) {
                    handle(parent as HTMLElement);
                }
            }
        }

        for (const node of batch.characterDataNodes) {
            const parent = (node as Node).parentElement;
            if (!parent) continue;
            if (parent.matches(COMBINED_TEXT_SELECTOR)) {
                handle(findNameWrapper(parent));
            } else if (parent.matches(COMBINED_WRAPPER_SELECTOR)) {
                handle(parent as HTMLElement);
            }
        }

        for (const el of batch.attributeNodes) {
            if (!(el instanceof Element)) continue;
            if (el.matches(COMBINED_TEXT_SELECTOR)) {
                handle(findNameWrapper(el));
            } else if (el.matches(COMBINED_WRAPPER_SELECTOR)) {
                handle(el as HTMLElement);
            }
        }
    } else {
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
            const had = w.querySelector('.' + BADGE_CLASS);
            const marked = w.dataset[MARK_ATTR] === 'true';
            if (!had && !marked) continue;
            w.querySelectorAll('.' + BADGE_CLASS).forEach((n) => n.remove());
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
        logger.debug(`✅ Synced badges on ${processed} name node(s)`);
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    ensureStyles();
    logger.info('✅ Badges enabled');
    apply();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    removeAllMarks();
    removeStyles();
    betaCache.clear();
    logger.info('✅ Badges disabled');
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