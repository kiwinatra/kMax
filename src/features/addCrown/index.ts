// src/features/addCrown/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa } from '../../core/dom';
import { throttle, isTabVisible } from '../../core/performance';
import { OFFSETS } from '../../offsets';

const DEBOUNCE_DELAY = 500;
const CROWN_EMOJI = '👑';
const GOLD_COLOR = '#ffd700';
const GOLD_SHADOW = '0 0 20px rgba(255, 215, 0, 0.4)';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let processTimeout: number | null = null;

const NAME_SELECTORS = [
    OFFSETS.classes.name,
    'span.text.svelte-1riu5uh',
    '.text.svelte-1riu5uh',
];

// ===== ОПТИМИЗИРОВАННАЯ ПРОВЕРКА БЕТА-ТЕСТЕРА (кеширование) =====
const betaCache = new Map<string, boolean>();

function isBetaTester(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim().toLowerCase();
    if (betaCache.has(trimmed)) return betaCache.get(trimmed)!;
    
    const result = OFFSETS.betaTesters.some(tester => {
        const t = tester.trim().toLowerCase();
        return trimmed === t || trimmed.includes(t) || t.includes(trimmed);
    });
    betaCache.set(trimmed, result);
    return result;
}

function findNameElements(): Element[] {
    for (const selector of NAME_SELECTORS) {
        const elements = qsa(selector);
        if (elements.length > 0) return elements;
    }
    return [];
}

// ===== ОПТИМИЗИРОВАННАЯ ОБРАБОТКА (только видимые элементы) =====
function processPage(): void {
    if (!isEnabled || !isTabVisible()) return;
    
    const enabled = storage.getBoolean('showCrown');
    if (!enabled) return;

    const nameElements = findNameElements();
    if (nameElements.length === 0) return;

    let processed = 0;
    for (const el of nameElements) {
        const element = el as HTMLElement;
        if (element.dataset.kmodCrown === 'true') continue;
        
        const name = element.textContent?.trim() || '';
        if (!name || !isBetaTester(name)) continue;
        
        element.dataset.kmodCrown = 'true';
        element.style.color = GOLD_COLOR;
        element.style.fontWeight = '700';
        element.style.textShadow = GOLD_SHADOW;
        if (!element.textContent?.includes(CROWN_EMOJI)) {
            element.textContent += ` ${CROWN_EMOJI}`;
        }
        processed++;
    }
    
    if (processed > 0) logger.debug(`👑 Applied ${processed} crowns`);
}

// ===== THROTTLED ВЕРСИЯ (не чаще 1 раза в 500ms) =====
const throttledProcess = throttle(processPage, 500);

function debouncedProcess(): void {
    if (processTimeout) clearTimeout(processTimeout);
    processTimeout = window.setTimeout(() => {
        processTimeout = null;
        throttledProcess();
    }, 200);
}

export function apply(): void {
    processPage();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('👑 Crown enabled');
    processPage();
    if (!unwatch) {
        unwatch = watchDOM(() => debouncedProcess());
    }
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    if (unwatch) { unwatch(); unwatch = null; }
    if (processTimeout) { clearTimeout(processTimeout); processTimeout = null; }
    // Удаляем короны
    const elements = findNameElements();
    for (const el of elements) {
        const e = el as HTMLElement;
        e.style.color = '';
        e.style.fontWeight = '';
        e.style.textShadow = '';
        if (e.textContent) e.textContent = e.textContent.replace(` ${CROWN_EMOJI}`, '').replace(CROWN_EMOJI, '');
        delete e.dataset.kmodCrown;
    }
    betaCache.clear();
    logger.info('👑 Crown disabled');
}

export function toggle(): boolean {
    const current = storage.getBoolean('showCrown');
    const newState = !current;
    storage.setBoolean('showCrown', newState);
    if (newState) enable(); else disable();
    return newState;
}