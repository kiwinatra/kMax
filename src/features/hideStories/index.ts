// src/features/hideStories/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';

const DEBOUNCE_DELAY = 300;
const STORIES_SELECTOR = '.storiesStack.svelte-1rr6jx2'; // ← обновлённый селектор

let isEnabled = false;
let unwatch: (() => void) | null = null;
let debounceTimer: number | null = null;
let cachedElements: HTMLElement[] = [];

function getStoriesElements(): HTMLElement[] {
    if (cachedElements.length > 0 && cachedElements.some(el => document.contains(el))) {
        return cachedElements;
    }
    // Ищем все элементы storiesStack
    cachedElements = qsa<HTMLElement>(STORIES_SELECTOR);
    
    // Если не нашли по основному селектору - пробуем fallback
    if (cachedElements.length === 0) {
        cachedElements = qsa<HTMLElement>('.storiesStack');
    }
    
    return cachedElements;
}

function hideAll(): void {
    const elements = getStoriesElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📚 Hidden ${count} stories`);
    }
}

function showAll(): void {
    const elements = getStoriesElements();
    let count = 0;
    for (const el of elements) {
        if (el.style.display === 'none') {
            el.style.display = '';
            count++;
        }
    }
    if (count > 0) {
        logger.debug(`📚 Shown ${count} stories`);
    }
    cachedElements = [];
}

function processPage(): void {
    const enabled = storage.getBoolean('hideStories');
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

    logger.info('📚 Stories hide enabled');
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

    logger.info('📚 Stories hide disabled');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hideStories');
    const newState = !current;
    storage.setBoolean('hideStories', newState);

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