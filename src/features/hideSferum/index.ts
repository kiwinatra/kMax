// src/features/hideSferum/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa } from '../../core/dom';

const DEBOUNCE_DELAY = 300;
const SFERUM_BUTTON_SELECTOR = '.item.svelte-6bkz6t';
const SFERUM_TEXT = 'Войти в Cферум';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let debounceTimer: number | null = null;
let hiddenButtons: Map<Element, { parent: Node; nextSibling: Node | null }> = new Map();

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

function findSferumButtons(): Element[] {
    // Ищем все элементы .item.svelte-6bkz6t
    let buttons = qsa(SFERUM_BUTTON_SELECTOR);
    
    // Fallback: если не нашли, пробуем без хэша
    if (buttons.length === 0) {
        buttons = qsa('.item');
    }
    
    const result: Element[] = [];
    for (const btn of buttons) {
        if (isSferumButton(btn)) {
            result.push(btn);
        }
    }
    return result;
}

function saveButtonPosition(btn: Element): void {
    if (!hiddenButtons.has(btn) && btn.parentNode) {
        hiddenButtons.set(btn, {
            parent: btn.parentNode,
            nextSibling: btn.nextSibling,
        });
    }
}

function hideAll(): void {
    const buttons = findSferumButtons();
    let count = 0;

    for (const btn of buttons) {
        saveButtonPosition(btn);
        btn.remove();
        count++;
    }

    if (count > 0) {
        logger.debug(`🧹 Removed ${count} Sferum button(s)`);
    }
}

function restoreAll(): void {
    let count = 0;

    for (const [btn, position] of hiddenButtons) {
        try {
            if (document.contains(btn)) continue;

            if (position.nextSibling && position.nextSibling.parentNode) {
                position.parent.insertBefore(btn, position.nextSibling);
            } else {
                position.parent.appendChild(btn);
            }
            count++;
        } catch (error) {
            logger.debug('Failed to restore Sferum button:', error);
        }
    }

    hiddenButtons.clear();

    if (count > 0) {
        logger.debug(`♻️ Restored ${count} Sferum button(s)`);
    }
}

function processPage(): void {
    const enabled = storage.getBoolean('hideSferum');
    if (enabled) {
        if (hiddenButtons.size > 0) {
            hiddenButtons.clear();
        }
        hideAll();
    } else {
        restoreAll();
    }
}

function debouncedProcess(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        processPage();
    }, DEBOUNCE_DELAY);
}

export function apply(): void {
    processPage();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    logger.info('🧹 Sferum button hide enabled');
    processPage();

    if (!unwatch) {
        unwatch = watchDOM(() => {
            debouncedProcess();
        });
    }
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    if (unwatch) {
        unwatch();
        unwatch = null;
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    restoreAll();

    logger.info('🧹 Sferum button hide disabled');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hideSferum');
    const newState = !current;
    storage.setBoolean('hideSferum', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}

window.addEventListener('beforeunload', () => {
    if (unwatch) {
        unwatch();
        unwatch = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
});