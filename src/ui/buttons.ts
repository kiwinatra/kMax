/*
 * @author: potemk.in
 * @brief: Creates the "Settings" button in the sidebar next to the native settings tab.
 * @desc: Subscribes to the centralized DOM observer WITHOUT a selector filter.
 *        Reason: Svelte re-creates the .settingsTab node with a different hash
 *        class on every navigation to Settings, so filtering by the old hash
 *        class would miss the new node. The callback is idempotent, so being
 *        called on every batch is cheap and safe.
 *
 *        FIX: the button can disappear if Svelte re-creates the container.
 *        We now:
 *          1) remember the container the button was attached to;
 *          2) on every mutation batch check that the button still exists
 *             AND is still a child of the current container;
 *          3) if not — re-create it.
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

/**
 * The container the button was last attached to.
 * Used to detect when Svelte re-creates the container node.
 */
let attachedContainer: Element | null = null;

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

/**
 * Idempotent. Creates the button only if:
 *   - the container exists;
 *   - the container does NOT already contain our button.
 *
 * Also updates `attachedContainer` so the observer can detect
 * container re-creation.
 */
export function createSettingsButton(): boolean {
    if (isCreating) return false;
    isCreating = true;

    try {
        const container = getContainer();
        if (!container) return false;

        // Already in this exact container — nothing to do.
        const existing = container.querySelector(`.${SETTINGS_BUTTON_CLASS}`);
        if (existing && existing.parentElement === container) {
            attachedContainer = container;
            return false;
        }

        // Stale button from a previous container — remove it.
        if (existing) existing.remove();

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
        attachedContainer = container;

        logger.debug('Settings button created');
        return true;
    } catch (error) {
        logger.error('Failed to create settings button:', error);
        return false;
    } finally {
        isCreating = false;
    }
}

/**
 * Returns true if the button still exists AND is attached
 * to the currently resolved container.
 */
function isButtonAttached(): boolean {
    if (!attachedContainer || !attachedContainer.isConnected) return false;

    const container = getContainer();
    if (!container) return false;

    // Container was re-created by Svelte.
    if (container !== attachedContainer) return false;

    const btn = container.querySelector(`.${SETTINGS_BUTTON_CLASS}`);
    return !!btn && btn.parentElement === container;
}

/**
 * Called on every mutation batch. Cheap when everything is fine.
 */
export function ensureButtons(): void {
    if (isButtonAttached()) return;
    createSettingsButton();
}

export function removeButtons(): void {
    const container = getContainer();
    if (!container) return;
    const btns = container.querySelectorAll(`.${SETTINGS_BUTTON_CLASS}`);
    for (const btn of btns) btn.remove();
    attachedContainer = null;
    logger.debug('Buttons removed');
}

// ============================================================
// OBSERVER SUBSCRIPTION
// ============================================================

/**
 * Subscribe to the centralized observer.
 * No selector filter — Svelte changes the .settingsTab hash class on each
 * navigation, so filter-based subscription would miss the new container.
 * The callback is idempotent (ensureButtons checks attachment before
 * appending), so being called on every batch is cheap.
 */
export function waitForSettingsAndCreateButtons(): void {
    if (unwatch) return;

    unwatch = watchDOM(() => {
        ensureButtons();
    });

    // Immediate attempt for already-rendered DOM.
    ensureButtons();
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