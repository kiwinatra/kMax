/*
* @author: potemk.in
* @brief: Badges for beta testers, developers, bug hunters, loved ones.
* @desc: Appends small icons next to the nickname inside <span class="name">.
*
*       ── HOW TO EDIT ROLES ──────────────────────────────────────
*       Fill ROLE_MAP below. Key   = nickname as it appears in DOM
*                                   (case / ё / spaces are normalized).
*       Value = array of roles: 'dev' | 'bug' | 'heart'.
*       'verified' is granted automatically to every OFFSETS.betaTesters
*       match — don't add it here.
*
*       Example:
*           'аня': ['heart'],
*           'потемкин александр': ['dev'],
*           'тимоха': ['bug', 'heart'],
*       ────────────────────────────────────────────────────────────
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { ObserverBatch } from '../../core/observer';

// ============================================================
// ★ EDIT THIS SECTION TO MANAGE ROLES ★
// ============================================================

type Role = 'dev' | 'bug' | 'heart';

const ROLE_MAP: Record<string, Role[]> = {
    'потемкин александр': ['dev'],
    'тимофей борин':      ['bug'],
    'борин тимофей':      ['bug'],
    'тимоха':             ['bug'],
    'катяя':              ['heart'],
    'катерина айхерт':    ['heart'],
};

// ============================================================
// CONSTANTS
// ============================================================

const MARK_ATTR = 'kmodCrown';
const BADGE_CLASS = 'kmod-badge';
const STYLE_ID = 'kmod-crown-styles';
const TOOLTIP_ID = 'kmod-badge-tooltip';
const MAX_BETA_CACHE = 200;

const TOOLTIP_DELAY = 180;
const TOOLTIP_OFFSET = 8;
const RESCAN_INTERVAL = 1500;

type BadgeType = 'verified' | Role;

const TOOLTIP_TEXTS: Record<BadgeType, string> = {
    verified: 'Верифицированный пользователь',
    dev:      'Разработчик',
    bug:      'Баг-хантер',
    heart:    '<3',
};

const NAME_WRAPPER_SELECTORS = [
    'span.name.svelte-1riu5uh',
    'span.name.svelte-6bkz6t',
    'span.name',
];

const NAME_TEXT_SELECTORS = [
    OFFSETS.classes.name,
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
let rescanTimer: number | null = null;

// ============================================================
// STYLES
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
    cursor: help;
}
.${BADGE_CLASS} svg {
    display: block;
    width: 16px;
    height: 16px;
}
.${BADGE_CLASS}-verified { color: inherit; }
.${BADGE_CLASS}-dev      { color: #a78bfa; }
.${BADGE_CLASS}-bug      { color: #fb923c; }
.${BADGE_CLASS}-heart    { color: #f472b6; }

#${TOOLTIP_ID} {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;

    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(15, 15, 25, 0.96);
    color: #f0f0f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    white-space: nowrap;

    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);

    opacity: 0;
    transform: translateY(-3px);
    transition: opacity 0.15s ease, transform 0.15s ease;
}
#${TOOLTIP_ID}.kmod-tt-visible {
    opacity: 1;
    transform: translateY(0);
}
#${TOOLTIP_ID}::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: rgba(15, 15, 25, 0.96);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
`;
    document.head.appendChild(style);
}

function removeStyles(): void {
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(TOOLTIP_ID)?.remove();
}

// ============================================================
// TOOLTIP
// ============================================================

let tooltipEl: HTMLDivElement | null = null;
let tooltipTimer: number | null = null;
let currentBadge: HTMLElement | null = null;

function ensureTooltip(): HTMLDivElement {
    if (tooltipEl && document.body.contains(tooltipEl)) return tooltipEl;
    const el = document.createElement('div');
    el.id = TOOLTIP_ID;
    document.body.appendChild(el);
    tooltipEl = el;
    return el;
}

function showTooltip(badge: HTMLElement): void {
    const type = badge.dataset.kmodBadge as BadgeType | undefined;
    if (!type) return;
    const text = TOOLTIP_TEXTS[type];
    if (!text) return;

    const el = ensureTooltip();
    el.textContent = text;
    el.classList.remove('kmod-tt-visible');

    requestAnimationFrame(() => {
        if (!badge.isConnected) return;
        const rect = badge.getBoundingClientRect();
        const ttRect = el.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - ttRect.width / 2;
        let top = rect.top - ttRect.height - TOOLTIP_OFFSET;

        const margin = 6;
        if (left < margin) left = margin;
        if (left + ttRect.width > window.innerWidth - margin) {
            left = window.innerWidth - ttRect.width - margin;
        }
        if (top < margin) top = rect.bottom + TOOLTIP_OFFSET;

        el.style.left = `${Math.round(left)}px`;
        el.style.top  = `${Math.round(top)}px`;
        el.classList.add('kmod-tt-visible');
    });
}

function hideTooltip(): void {
    if (tooltipTimer !== null) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
    }
    currentBadge = null;
    if (tooltipEl) tooltipEl.classList.remove('kmod-tt-visible');
}

function onPointerOver(e: Event): void {
    const target = e.target as Element | null;
    if (!target) return;
    const badge = target.closest?.('.' + BADGE_CLASS) as HTMLElement | null;
    if (!badge || !badge.dataset.kmodBadge) return;
    if (badge === currentBadge) return;

    hideTooltip();
    currentBadge = badge;
    tooltipTimer = window.setTimeout(() => {
        tooltipTimer = null;
        if (currentBadge === badge && badge.isConnected) showTooltip(badge);
    }, TOOLTIP_DELAY);
}

function onPointerOut(e: Event): void {
    const target = e.target as Element | null;
    if (!target) return;
    const badge = target.closest?.('.' + BADGE_CLASS);
    if (!badge) return;
    if (badge === currentBadge) hideTooltip();
}

function installTooltipDelegation(): void {
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mouseout', onPointerOut, true);
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('blur', hideTooltip);
}

function uninstallTooltipDelegation(): void {
    document.removeEventListener('mouseover', onPointerOver, true);
    document.removeEventListener('mouseout', onPointerOut, true);
    window.removeEventListener('scroll', hideTooltip, true);
    window.removeEventListener('blur', hideTooltip);
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

function createVerifiedBadge(): HTMLElement {
    const i = makeRoot('verified');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#icon_verification_mini_themed');
    svg.appendChild(use);
    i.appendChild(svg);
    return i;
}

function createDevBadge(): HTMLElement {
    const i = makeRoot('dev');
    const svg = makeSvg('0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const d of ['M5.5 5L2.5 8L5.5 11', 'M10.5 5L13.5 8L10.5 11', 'M9 3.5L7 12.5']) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
    }
    i.appendChild(svg);
    return i;
}

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

    for (const d of [
        'M8 6V3.5', 'M6 3.5L7 5', 'M10 3.5L9 5',
        'M5 8L2.5 7.5', 'M5 10.5L2.5 11.5',
        'M11 8L13.5 7.5', 'M11 10.5L13.5 11.5',
    ]) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
    }
    i.appendChild(svg);
    return i;
}

/** Heart badge — filled heart, pink. */
function createHeartBadge(): HTMLElement {
    const i = makeRoot('heart');
    const svg = makeSvg('0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
        'd',
        'M12 21s-7.5-4.9-9.5-9.2C.9 8.7 2.8 5 6.3 5c2 0 3.5 1.1 4.7 2.6C12.2 6.1 13.7 5 15.7 5c3.5 0 5.4 3.7 3.8 6.8C19.5 16.1 12 21 12 21z'
    );
    svg.appendChild(path);
    i.appendChild(svg);
    return i;
}

function createBadge(type: BadgeType): HTMLElement {
    if (type === 'verified') return createVerifiedBadge();
    if (type === 'dev')      return createDevBadge();
    if (type === 'bug')      return createBugBadge();
    return createHeartBadge();
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

    const normalized = normalizeName(name);
    const isBeta = isBetaTester(name);
    const roles: Role[] = isBeta ? (ROLE_MAP[normalized] || []) : [];

    const expected: BadgeType[] = [];
    if (isBeta) expected.push('verified');
    for (const r of roles) expected.push(r);

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

function fullRescan(): number {
    let processed = 0;
    const seen = new WeakSet<HTMLElement>();
    for (const sel of NAME_WRAPPER_SELECTORS) {
        qsa<HTMLElement>(sel).forEach((w) => {
            if (seen.has(w)) return;
            seen.add(w);
            if (syncWrapper(w)) processed++;
        });
    }
    return processed;
}

// ============================================================
// AUTO-RESCAN
// ============================================================

function startAutoRescan(): void {
    if (rescanTimer !== null) return;
    rescanTimer = window.setInterval(() => {
        if (!isEnabled) return;
        if (document.visibilityState !== 'visible') return;
        if (!storage.getBoolean('showCrown')) return;
        try {
            fullRescan();
        } catch (e) {
            logger.error('Auto-rescan failed:', e);
        }
    }, RESCAN_INTERVAL);
    logger.debug(`🔄 Auto-rescan started (every ${RESCAN_INTERVAL}ms)`);
}

function stopAutoRescan(): void {
    if (rescanTimer === null) return;
    clearInterval(rescanTimer);
    rescanTimer = null;
    logger.debug('🔄 Auto-rescan stopped');
}

// ============================================================
// REMOVE
// ============================================================

function removeAllMarks(): void {
    hideTooltip();
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
    installTooltipDelegation();
    logger.info('✅ Badges enabled');
    apply();
    startAutoRescan();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    stopAutoRescan();
    uninstallTooltipDelegation();
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