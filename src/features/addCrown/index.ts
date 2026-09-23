/*
* @author: potemk.in
* @brief: Badges for beta testers, developers, bug hunters, loved ones.
* @desc: Bulletproof version.
*       - Aggressive rescan: 500ms interval + visibility + focus + scroll + click.
*       - Inline styles on every badge (not just CSS class) — survives even
*         if our injected <style> gets removed.
*       - Only simple SVG primitives (line/polyline/ellipse/circle) plus one
*         well-tested Material Icons path for the heart.
*       - Everything wrapped in try/catch — never throws.
*
*       ── HOW TO EDIT ROLES ──────────────────────────────────────
*       ROLE_MAP: key = normalized nickname (lowercase, ё→е, single spaces),
*       value = array of roles: 'dev' | 'bug' | 'heart'.
*       'verified' is granted automatically to OFFSETS.betaTesters matches.
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
    'екатерина райхерт':  ['heart'],
    'катяя':              ['heart'],
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
const RESCAN_INTERVAL = 500;

type BadgeType = 'verified' | Role;

const BADGE_COLORS: Record<BadgeType, string> = {
    verified: 'currentColor',
    dev:      '#a78bfa',
    bug:      '#fb923c',
    heart:    '#f472b6',
};

const TOOLTIP_TEXTS: Record<BadgeType, string> = {
    verified: 'Верифицированный пользователь',
    dev:      'Разработчик',
    bug:      'Баг-хантер',
    heart:    'Любимый человек',
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
    '.text',
];

const COMBINED_TEXT_SELECTOR = NAME_TEXT_SELECTORS.join(',');
const COMBINED_WRAPPER_SELECTOR = NAME_WRAPPER_SELECTORS.join(',');

const SVG_NS = 'http://www.w3.org/2000/svg';

// Inline styles applied to EVERY badge via el.style.cssText.
// Belt & suspenders: even if the injected <style> tag is removed or
// fails to apply, the badge still renders correctly.
const BADGE_INLINE_STYLE = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'vertical-align:middle',
    'margin-left:4px',
    'flex-shrink:0',
    'line-height:0',
    'width:16px',
    'height:16px',
    'position:relative',
    'top:-0.08em',
    'cursor:help',
].join(';');

const SVG_INLINE_STYLE = 'display:block;width:16px;height:16px';

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
const betaCache = new Map<string, boolean>();
let rescanTimer: number | null = null;
let listenersInstalled = false;

// ============================================================
// STYLES (injected once, but not relied upon — inline styles too)
// ============================================================

function ensureStyles(): void {
    try {
        if (document.getElementById(STYLE_ID)) return;
        if (!document.head) return;
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
.${BADGE_CLASS} svg { display: block; width: 16px; height: 16px; }
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
#${TOOLTIP_ID}.kmod-tt-visible { opacity: 1; transform: translateY(0); }
`;
        document.head.appendChild(style);
    } catch {}
}

function removeStyles(): void {
    try { document.getElementById(STYLE_ID)?.remove(); } catch {}
    try { document.getElementById(TOOLTIP_ID)?.remove(); } catch {}
}

// ============================================================
// TOOLTIP
// ============================================================

let tooltipEl: HTMLDivElement | null = null;
let tooltipTimer: number | null = null;
let currentBadge: HTMLElement | null = null;

function ensureTooltip(): HTMLDivElement | null {
    try {
        if (tooltipEl && document.body.contains(tooltipEl)) return tooltipEl;
        if (!document.body) return null;
        const el = document.createElement('div');
        el.id = TOOLTIP_ID;
        el.style.cssText = `
            position:fixed;z-index:2147483647;pointer-events:none;
            padding:6px 10px;border-radius:8px;
            background:rgba(15,15,25,0.96);color:#f0f0f0;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
            font-size:12px;font-weight:600;letter-spacing:0.2px;white-space:nowrap;
            border:1px solid rgba(255,255,255,0.08);
            box-shadow:0 6px 24px rgba(0,0,0,0.5);
            opacity:0;transform:translateY(-3px);
            transition:opacity .15s ease,transform .15s ease;
        `;
        document.body.appendChild(el);
        tooltipEl = el;
        return el;
    } catch {
        return null;
    }
}

function showTooltip(badge: HTMLElement): void {
    try {
        const type = badge.dataset.kmodBadge as BadgeType | undefined;
        if (!type) return;
        const text = TOOLTIP_TEXTS[type];
        if (!text) return;

        const el = ensureTooltip();
        if (!el) return;
        el.textContent = text;
        el.style.opacity = '0';

        requestAnimationFrame(() => {
            try {
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
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            } catch {}
        });
    } catch {}
}

function hideTooltip(): void {
    try {
        if (tooltipTimer !== null) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        currentBadge = null;
        if (tooltipEl) {
            tooltipEl.style.opacity = '0';
            tooltipEl.style.transform = 'translateY(-3px)';
        }
    } catch {}
}

function onPointerOver(e: Event): void {
    try {
        const target = e.target as Element | null;
        if (!target || !(target as Element).closest) return;
        const badge = target.closest('.' + BADGE_CLASS) as HTMLElement | null;
        if (!badge || !badge.dataset.kmodBadge) return;
        if (badge === currentBadge) return;
        hideTooltip();
        currentBadge = badge;
        tooltipTimer = window.setTimeout(() => {
            tooltipTimer = null;
            if (currentBadge === badge && badge.isConnected) showTooltip(badge);
        }, TOOLTIP_DELAY);
    } catch {}
}

function onPointerOut(e: Event): void {
    try {
        const target = e.target as Element | null;
        if (!target || !(target as Element).closest) return;
        const badge = target.closest('.' + BADGE_CLASS);
        if (!badge) return;
        if (badge === currentBadge) hideTooltip();
    } catch {}
}

function installTooltipDelegation(): void {
    if (listenersInstalled) return;
    listenersInstalled = true;
    try {
        document.addEventListener('mouseover', onPointerOver, true);
        document.addEventListener('mouseout', onPointerOut, true);
        window.addEventListener('scroll', hideTooltip, true);
        window.addEventListener('blur', hideTooltip);
    } catch {}
}

function uninstallTooltipDelegation(): void {
    listenersInstalled = false;
    try {
        document.removeEventListener('mouseover', onPointerOver, true);
        document.removeEventListener('mouseout', onPointerOut, true);
        window.removeEventListener('scroll', hideTooltip, true);
        window.removeEventListener('blur', hideTooltip);
    } catch {}
}

// ============================================================
// NORMALIZATION
// ============================================================

function normalizeName(name: string): string {
    if (!name) return '';
    try {
        return name
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, ' ')
            .trim();
    } catch {
        return '';
    }
}

function isBetaTester(name: string): boolean {
    const trimmed = normalizeName(name);
    if (!trimmed) return false;

    const cached = betaCache.get(trimmed);
    if (cached !== undefined) return cached;

    let result = false;
    try {
        result = OFFSETS.betaTesters.some((tester) => {
            const t = normalizeName(tester);
            if (!t) return false;
            return trimmed === t || trimmed.includes(t) || t.includes(trimmed);
        });
    } catch {
        result = false;
    }

    if (betaCache.size >= MAX_BETA_CACHE) betaCache.clear();
    betaCache.set(trimmed, result);
    return result;
}

// ============================================================
// SVG BUILDERS — only guaranteed-to-render primitives
// ============================================================

function makeRoot(type: BadgeType): HTMLElement {
    const i = document.createElement('i');
    i.className = `icon svelte-i2tuez ${BADGE_CLASS} ${BADGE_CLASS}-${type}`;
    i.dataset.kmodBadge = type;
    // Inline style — belt & suspenders against CSS injection failure.
    i.style.cssText = BADGE_INLINE_STYLE;
    // Inline color for role badges (overrides any inherited color).
    i.style.color = BADGE_COLORS[type];
    return i;
}

function makeSvg(viewBox: string, fill: string = 'none', stroke: string = 'currentColor', strokeWidth: string = '1.6'): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', fill);
    svg.setAttribute('stroke', stroke);
    svg.setAttribute('stroke-width', strokeWidth);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.cssText = SVG_INLINE_STYLE;
    return svg;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string>
): SVGElementTagNameMap[K] {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

function createVerifiedBadge(): HTMLElement {
    const i = makeRoot('verified');
    const svg = makeSvg('0 0 24 24');
    // Native sprite — guaranteed since the site itself uses it.
    const use = svgEl('use', { href: '#icon_verification_mini_themed' });
    svg.appendChild(use);
    i.appendChild(svg);
    return i;
}

function createDevBadge(): HTMLElement {
    const i = makeRoot('dev');
    const svg = makeSvg('0 0 16 16');
    // Only line / polyline primitives.
    svg.appendChild(svgEl('polyline', { points: '5.5,4 2.5,8 5.5,12' }));
    svg.appendChild(svgEl('polyline', { points: '10.5,4 13.5,8 10.5,12' }));
    svg.appendChild(svgEl('line', { x1: '9.5', y1: '3', x2: '6.5', y2: '13' }));
    i.appendChild(svg);
    return i;
}

function createBugBadge(): HTMLElement {
    const i = makeRoot('bug');
    const svg = makeSvg('0 0 16 16', 'none', 'currentColor', '1.4');
    svg.appendChild(svgEl('ellipse', { cx: '8', cy: '9.5', rx: '3', ry: '3.5' }));
    svg.appendChild(svgEl('line', { x1: '8', y1: '6',  x2: '8',  y2: '3' }));
    svg.appendChild(svgEl('line', { x1: '5', y1: '8',  x2: '2',  y2: '7' }));
    svg.appendChild(svgEl('line', { x1: '5', y1: '11', x2: '2',  y2: '12' }));
    svg.appendChild(svgEl('line', { x1: '11', y1: '8', x2: '14', y2: '7' }));
    svg.appendChild(svgEl('line', { x1: '11', y1: '11', x2: '14', y2: '12' }));
    i.appendChild(svg);
    return i;
}

function createHeartBadge(): HTMLElement {
    const i = makeRoot('heart');
    const svg = makeSvg('0 0 24 24', 'currentColor', 'none');
    // Material Icons heart — most battle-tested heart path in existence.
    const path = svgEl('path', {
        d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    });
    svg.appendChild(path);
    i.appendChild(svg);
    return i;
}

function createBadge(type: BadgeType): HTMLElement {
    try {
        if (type === 'verified') return createVerifiedBadge();
        if (type === 'dev')      return createDevBadge();
        if (type === 'bug')      return createBugBadge();
        return createHeartBadge();
    } catch {
        // Absolute fallback — never fail to return an element.
        const i = makeRoot(type);
        i.textContent = '●';
        return i;
    }
}

// ============================================================
// LOOKUP
// ============================================================

function findNameWrapper(el: Element | null): HTMLElement | null {
    if (!el) return null;
    try {
        for (const sel of NAME_WRAPPER_SELECTORS) {
            try { if (el.matches(sel)) return el as HTMLElement; } catch {}
        }
        for (const sel of NAME_WRAPPER_SELECTORS) {
            try {
                const w = el.closest(sel);
                if (w) return w as HTMLElement;
            } catch {}
        }
    } catch {}
    return null;
}

function getNameText(nameWrapper: HTMLElement): string {
    try {
        for (const sel of NAME_TEXT_SELECTORS) {
            const textEl = nameWrapper.querySelector(sel);
            if (textEl) {
                const t = (textEl.textContent || '').trim();
                if (t) return t;
            }
        }
        return (nameWrapper.textContent || '').trim();
    } catch {
        return '';
    }
}

// ============================================================
// SYNC
// ============================================================

function syncWrapper(nameWrapper: HTMLElement): boolean {
    try {
        const name = getNameText(nameWrapper);
        if (!name) return false;

        const normalized = normalizeName(name);
        const isBeta = isBetaTester(name);
        const roles: Role[] = ROLE_MAP[normalized] || [];

        const expected: BadgeType[] = [];
        if (isBeta) expected.push('verified');
        for (const r of roles) expected.push(r);

        // Don't duplicate native MAX verification badge.
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
    } catch (e) {
        logger.error('syncWrapper failed:', e);
        return false;
    }
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

    try {
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
            fullRescan();
        }
    } catch (e) {
        logger.error('processBatch failed:', e);
    }

    return processed;
}

function fullRescan(): number {
    let processed = 0;
    const seen = new WeakSet<HTMLElement>();
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try {
            qsa<HTMLElement>(sel).forEach((w) => {
                if (seen.has(w)) return;
                seen.add(w);
                if (syncWrapper(w)) processed++;
            });
        } catch {}
    }
    return processed;
}

// ============================================================
// AUTO-RESCAN — aggressive
// ============================================================

function startAutoRescan(): void {
    if (rescanTimer !== null) return;

    rescanTimer = window.setInterval(() => {
        try {
            if (!isEnabled) return;
            if (!storage.getBoolean('showCrown')) return;
            fullRescan();
        } catch (e) {
            logger.error('Auto-rescan failed:', e);
        }
    }, RESCAN_INTERVAL);

    // Extra triggers on top of the interval.
    try {
        document.addEventListener('visibilitychange', onVisibilityRescan);
        window.addEventListener('focus', onFocusRescan);
        document.addEventListener('click', onFocusRescan, true);
    } catch {}

    logger.debug(`🔄 Auto-rescan started (every ${RESCAN_INTERVAL}ms)`);
}

function onVisibilityRescan(): void {
    try {
        if (!isEnabled) return;
        if (document.visibilityState !== 'visible') return;
        if (!storage.getBoolean('showCrown')) return;
        fullRescan();
    } catch {}
}

function onFocusRescan(): void {
    try {
        if (!isEnabled) return;
        if (!storage.getBoolean('showCrown')) return;
        setTimeout(fullRescan, 50);
    } catch {}
}

function stopAutoRescan(): void {
    try {
        if (rescanTimer !== null) {
            clearInterval(rescanTimer);
            rescanTimer = null;
        }
        document.removeEventListener('visibilitychange', onVisibilityRescan);
        window.removeEventListener('focus', onFocusRescan);
        document.removeEventListener('click', onFocusRescan, true);
    } catch {}
    logger.debug('🔄 Auto-rescan stopped');
}

// ============================================================
// REMOVE
// ============================================================

function removeAllMarks(): void {
    try { hideTooltip(); } catch {}
    for (const sel of NAME_WRAPPER_SELECTORS) {
        try {
            qsa<HTMLElement>(sel).forEach((w) => {
                const had = w.querySelector('.' + BADGE_CLASS);
                const marked = w.dataset[MARK_ATTR] === 'true';
                if (!had && !marked) return;
                w.querySelectorAll('.' + BADGE_CLASS).forEach((n) => n.remove());
                delete w.dataset[MARK_ATTR];
            });
        } catch {}
    }
}

// ============================================================
// PUBLIC API
// ============================================================

export function apply(batch?: ObserverBatch): void {
    try {
        if (!storage.getBoolean('showCrown')) {
            removeAllMarks();
            return;
        }
        // Re-inject styles on every apply — cheap and heals missing CSS.
        ensureStyles();

        const processed = processBatch(batch);
        if (processed > 0) {
            logger.debug(`✅ Synced badges on ${processed} name node(s)`);
        }
    } catch (e) {
        logger.error('apply failed:', e);
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