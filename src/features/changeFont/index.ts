/*
* @author: potemk.in
* @brief: Site-wide font switcher using a single CSS custom property.
* @desc: Replaces the previous "* { font-family !important }" approach, which
*       forced a full style recalc on every element, with a :root variable and
*       an explicit rule for html/body plus form controls (which don't inherit
*       by default). Google Fonts are loaded via a single <link> tag, only when
*       a Google font is actually selected, and swapped/removed on change.
*       No timers, no observers — pure, idempotent apply.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { FONTS } from '../../offsets';

// ============================================================
// TYPES & EXPORTED LISTS
// ============================================================

export type FontCategory = 'system' | 'google';

export type FontOption =
    | typeof FONTS.system[number]
    | typeof FONTS.google[number];

export const systemFonts = FONTS.system;
export const googleFonts = FONTS.google;
export const fontOptions: FontOption[] = [...FONTS.system, ...FONTS.google];

// ============================================================
// CONSTANTS
// ============================================================

const STYLE_ID = 'kmod-font-style';
const LINK_ID = 'kmod-font-link';
const STORAGE_KEY = 'fontFamily';
const DEFAULT_FONT_VALUE = FONTS.system[0].value;

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
let currentLabel: string | null = null;
let styleEl: HTMLStyleElement | null = null;
let linkEl: HTMLLinkElement | null = null;

// ============================================================
// LOOKUPS
// ============================================================

export function getFontByLabel(label: string): FontOption | undefined {
    return fontOptions.find((f) => f.label === label);
}

function getFontValue(label: string): string {
    return getFontByLabel(label)?.value ?? DEFAULT_FONT_VALUE;
}

// ============================================================
// STYLE / LINK MANAGEMENT
// ============================================================

function ensureStyleElement(): HTMLStyleElement {
    if (styleEl && document.head.contains(styleEl)) return styleEl;

    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
    return styleEl;
}

function removeStyleElement(): void {
    if (styleEl) {
        styleEl.remove();
        styleEl = null;
    }
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
}

function ensureFontLink(url: string): void {
    if (linkEl && linkEl.href === url && document.head.contains(linkEl)) return;

    if (linkEl) {
        linkEl.remove();
        linkEl = null;
    }
    const existing = document.getElementById(LINK_ID);
    if (existing) existing.remove();

    linkEl = document.createElement('link');
    linkEl.id = LINK_ID;
    linkEl.rel = 'stylesheet';
    linkEl.href = url;
    document.head.appendChild(linkEl);
}

function removeFontLink(): void {
    if (linkEl) {
        linkEl.remove();
        linkEl = null;
    }
    const existing = document.getElementById(LINK_ID);
    if (existing) existing.remove();
}

// ============================================================
// APPLY (the core, cheap path)
// ============================================================

function writeFontRule(fontValue: string): void {
    const el = ensureStyleElement();
    el.textContent = `
:root {
    --kmod-font: ${fontValue};
}
html, body {
    font-family: var(--kmod-font) !important;
}
button, input, textarea, select, option, optgroup {
    font-family: var(--kmod-font) !important;
}
`;
}

function clearFontRule(): void {
    removeStyleElement();
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Applies a font by its label. Persists the choice. Loads the Google Font
 * stylesheet only if the selected font requires one.
 */
export async function setFont(label: string): Promise<void> {
    const font = getFontByLabel(label);
    if (!font) {
        logger.warn(`🔤 Font not found: ${label}`);
        return;
    }

    currentLabel = label;
    storage.set(STORAGE_KEY, label);

    if ('url' in font && font.url) {
        ensureFontLink(font.url);
    } else {
        removeFontLink();
    }

    writeFontRule(font.value);
    logger.debug(`🔤 Font applied: ${label}`);
}

/** Reads the persisted font (if any) and applies it. Idempotent. */
export function applyStoredFont(): void {
    const saved = storage.get<string>(STORAGE_KEY);
    if (!saved) return;

    const font = getFontByLabel(saved);
    if (!font) {
        logger.warn(`🔤 Saved font not found: ${saved}`);
        storage.remove(STORAGE_KEY);
        return;
    }

    currentLabel = saved;
    if ('url' in font && font.url) {
        ensureFontLink(font.url);
    } else {
        removeFontLink();
    }
    writeFontRule(font.value);
    isEnabled = true;
}

/** Registry hook — reapply persisted font. */
export function apply(): void {
    const saved = storage.get<string>(STORAGE_KEY);
    if (saved) applyStoredFont();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    applyStoredFont();
    logger.info('🔤 Font feature enabled');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    currentLabel = null;
    storage.remove(STORAGE_KEY);
    clearFontRule();
    removeFontLink();

    logger.info('🔤 Font feature disabled (reset to system)');
}

export function toggle(): boolean {
    if (isEnabled) {
        disable();
        return false;
    }
    enable();
    return true;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        styleEl = null;
        linkEl = null;
    });
}