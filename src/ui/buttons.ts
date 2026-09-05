// src/ui/buttons.ts

import { createElement, qs } from '../core/dom';
import { logger } from '../core/logger';
import { openSettingsModal } from './settingsModal';
import { getLocale } from '../locales';
import { createSettingsIcon, createChevronIcon } from './icons';
import { debounce } from '../core/performance';
import { domCache } from '../core/cache';

const SETTINGS_BUTTON_CLASS = 'kmod-settings-btn';
const CONTAINER_CACHE_KEY = 'settings-container';

let observer: MutationObserver | null = null;
let isCreating = false;
let initialCheckDone = false;

function getContainer(): Element | null {
    // 1. Проверяем кеш
    const cached = domCache.get<Element>(CONTAINER_CACHE_KEY);
    if (cached && document.contains(cached)) {
        return cached;
    }

    // 2. Ищем заново
    const header = document.getElementById('aside-header-title');
    if (!header) return null;

    const headerText = header.textContent?.trim() || '';
    if (headerText !== 'Settings' && headerText !== 'Настройки') return null;

    const container = document.querySelector('.settingsTab.svelte-6bkz6t');
    if (container) {
        domCache.set(CONTAINER_CACHE_KEY, container, 10000); // 10 секунд
    }
    return container || null;
}

function createSvgWrapper(icon: SVGSVGElement, className: string): HTMLSpanElement {
    const wrapper = createElement('span', { className });
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.display = 'block';
    wrapper.appendChild(icon);
    return wrapper;
}

export function createSettingsButton(): void {
    if (isCreating) return;
    isCreating = true;

    try {
        const container = getContainer();
        if (!container) return;

        if (container.querySelector(`.${SETTINGS_BUTTON_CLASS}`)) return;

        const button = createElement('button', {
            className: `item svelte-6bkz6t ${SETTINGS_BUTTON_CLASS}`,
            events: {
                click: () => {
                    logger.info('Settings button clicked');
                    openSettingsModal();
                },
            },
        });

        const iconSpan = createSvgWrapper(createSettingsIcon(), 'itemIcon svelte-6bkz6t');
        const textNode = document.createTextNode(` ${getLocale('settingsTitle')} `);
        const rightIconSpan = createSvgWrapper(createChevronIcon(), 'icon svelte-6bkz6t');

        button.appendChild(iconSpan);
        button.appendChild(textNode);
        button.appendChild(rightIconSpan);

        container.appendChild(button);
        logger.debug('Settings button created');
    } catch (error) {
        logger.error('Failed to create settings button:', error);
    } finally {
        isCreating = false;
    }
}

export function ensureButtons(): void {
    createSettingsButton();
}

export function removeButtons(): void {
    const container = getContainer();
    if (!container) return;
    const btns = container.querySelectorAll(`.${SETTINGS_BUTTON_CLASS}`);
    for (const btn of btns) btn.remove();
    domCache.delete(CONTAINER_CACHE_KEY);
    logger.debug('Buttons removed');
}

export function waitForSettingsAndCreateButtons(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    observer = new MutationObserver(
        debounce(() => {
            const container = getContainer();
            if (container && !container.querySelector(`.${SETTINGS_BUTTON_CLASS}`)) {
                createSettingsButton();
            }
        }, 300)
    );

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    if (!initialCheckDone) {
        initialCheckDone = true;
        setTimeout(() => {
            const container = getContainer();
            if (container && !container.querySelector(`.${SETTINGS_BUTTON_CLASS}`)) {
                createSettingsButton();
            }
        }, 300);
    }
}

export function stopWaitingForSettings(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    domCache.delete(CONTAINER_CACHE_KEY);
    initialCheckDone = false;
    logger.debug('Stopped waiting for settings container');
}