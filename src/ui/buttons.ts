/*
* @author: potemk.in
* @brief: Creates the "Settings" button in the sidebar next to the native settings tab.
* @desc: Subscribes to the centralized DOM observer via watchDOM with a selector filter, so it only reacts when the header title or settings container appears. Idempotent — safe to call on every batch. No local MutationObserver, no debounce timers.
*/

import { createElement } from '../core/dom';
import { logger } from '../core/logger';
import { openSettingsModal } from './settingsModal';
import { getLocale } from '../locales';
import { createSettingsIcon, createChevronIcon } from './icons';
import { watchDOM } from '../core/observer';

// ============================================================
// CONSTANTS
// ============================================================

const SETTINGS_BUTTON_CLASS = 'kmod-settings-btn';
const HEADER_ID = 'aside-header-title';
const SETTINGS_CONTAINER_SELECTOR = '.settingsTab.svelte-6bkz6t';
const SETTINGS_CONTAINER_FALLBACK = '.settingsTab';

const HEADER_TEXT_MATCHERS = ['Settings', 'Настройки'];

// ============================================================
// STATE
// ============================================================

let unwatch: (() => void) | null = null;
let isCreating = false;

// ============================================================
// CONTAINER RESOLUTION
// ============================================================

function getContainer(): Element | null {
    const header = document.getElementById(HEADER_ID);
    if (!header) return null;

    const headerText = header.textContent?.trim() || '';
    if (!HEADER_TEXT_MATCHERS.includes(headerText)) return null;

    return (
        document.querySelector(SETTINGS_CONTAINER_SELECTOR) ||
        document.querySelector(SETTINGS_CONTAINER_FALLBACK)
    );
}

// ============================================================
// ICON WRAPPER
// ============================================================

function createSvgWrapper(icon: SVGSVGElement, className: string): HTMLSpanElement {
    const wrapper = createElement('span', { className });
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.display = 'block';
    wrapper.appendChild(icon);
    return wrapper;
}

// ============================================================
// BUTTON CREATION
// ============================================================

export function createSettingsButton(): boolean {
    if (isCreating) return false;
    isCreating = true;

    try {
        const container = getContainer();
        if (!container) return false;

        if (container.querySelector(`.${SETTINGS_BUTTON_CLASS}`)) return false;

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
        return true;
    } catch (error) {
        logger.error('Failed to create settings button:', error);
        return false;
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
    logger.debug('Buttons removed');
}

// ============================================================
// OBSERVER SUBSCRIPTION
// ============================================================

/**
 * Subscribe to the centralized observer. Reacts only when the sidebar header
 * or the settings container appears/changes. Idempotent and cheap.
 */
export function waitForSettingsAndCreateButtons(): void {
    if (unwatch) return;

    unwatch = watchDOM(
        () => {
            createSettingsButton();
        },
        [`#${HEADER_ID}`, SETTINGS_CONTAINER_SELECTOR, SETTINGS_CONTAINER_FALLBACK]
    );

    // Immediate attempt for already-rendered DOM.
    createSettingsButton();
}

export function stopWaitingForSettings(): void {
    if (unwatch) {
        unwatch();
        unwatch = null;
    }
    logger.debug('Stopped waiting for settings container');
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        stopWaitingForSettings();
    });
}