// src/features/hidePhone/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa } from '../../core/dom';

const DEBOUNCE_DELAY = 300;
const PHONE_SELECTOR = '.phone.svelte-6bkz6t';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let debounceTimer: number | null = null;
let cachedElements: HTMLElement[] = [];

function getPhoneElements(): HTMLElement[] {
    if (cachedElements.length > 0 && cachedElements.some(el => document.contains(el))) {
        return cachedElements;
    }
    cachedElements = qsa<HTMLElement>(PHONE_SELECTOR);
    
    // Fallback: если не нашли, пробуем без хэша
    if (cachedElements.length === 0) {
        cachedElements = qsa<HTMLElement>('.phone');
    }
    
    return cachedElements;
}

function hideAll(): void {
    const elements = getPhoneElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📱 Hidden ${count} phone element(s)`);
    }
}

function showAll(): void {
    const elements = getPhoneElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display === 'none') {
            el.style.display = '';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📱 Shown ${count} phone element(s)`);
    }
    cachedElements = [];
}

function processPage(): void {
    const enabled = storage.getBoolean('hidePhone');
    if (enabled) {
        hideAll();
    } else {
        showAll();
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

    logger.info('📱 Phone hide enabled');
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

    showAll();
    cachedElements = [];

    logger.info('📱 Phone hide disabled');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hidePhone');
    const newState = !current;
    storage.setBoolean('hidePhone', newState);

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