// src/ui/buttons.ts
import { createElement, qs } from '../core/dom';
import { logger } from '../core/logger';
import { openSettingsModal } from './settingsModal';
import { openFaqModal } from './faqModal';
import { getLocale } from '../locales';
import { createSettingsIcon, createFaqIcon, createChevronIcon } from './icons';

const SETTINGS_BUTTON_CLASS = 'kmod-settings-btn';
const FAQ_BUTTON_CLASS = 'kmod-faq-btn';

let containerCheckInterval: number | null = null;
let buttonsCreated = false;

function createSvgWrapper(icon: SVGSVGElement, className: string): HTMLSpanElement {
    const wrapper = createElement('span', {
        className: className,
    });

    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.display = 'block';

    wrapper.appendChild(icon);
    return wrapper;
}

function getContainer(): Element | null {
    const header = document.getElementById('aside-header-title');
    if (!header) return null;

    const headerText = header.textContent?.trim() || '';
    if (headerText !== 'Settings' && headerText !== 'Настройки') return null;

    const container = document.querySelector('.settingsTab.svelte-6bkz6t');
    return container || null;
}

export function createSettingsButton(): void {
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
}

export function createFaqButton(): void {
    const container = getContainer();
    if (!container) return;

    if (container.querySelector(`.${FAQ_BUTTON_CLASS}`)) return;

    const button = createElement('button', {
        className: `item svelte-6bkz6t ${FAQ_BUTTON_CLASS}`,
        events: {
            click: () => {
                logger.info('FAQ button clicked');
                openFaqModal();
            },
        },
    });

    const iconSpan = createSvgWrapper(createFaqIcon(), 'itemIcon svelte-6bkz6t');
    const textNode = document.createTextNode(` ${getLocale('faqTitle')} `);
    const rightIconSpan = createSvgWrapper(createChevronIcon(), 'icon svelte-6bkz6t');

    button.appendChild(iconSpan);
    button.appendChild(textNode);
    button.appendChild(rightIconSpan);

    container.appendChild(button);
    logger.debug('FAQ button created');
}

export function ensureButtons(): void {
    createSettingsButton();
    createFaqButton();
}

export function removeButtons(): void {
    const container = getContainer();
    if (!container) return;

    const btns = container.querySelectorAll(`.${SETTINGS_BUTTON_CLASS}, .${FAQ_BUTTON_CLASS}`);
    for (const btn of btns) {
        btn.remove();
    }
    logger.debug('Buttons removed');
}

export function waitForSettingsAndCreateButtons(): void {
    if (containerCheckInterval) {
        clearInterval(containerCheckInterval);
    }

    buttonsCreated = false;

    containerCheckInterval = window.setInterval(() => {
        const container = getContainer();
        
        if (container) {
            createSettingsButton();
            createFaqButton();
            
            if (!buttonsCreated) {
                buttonsCreated = true;
                logger.debug('Buttons created after container found');
            }
            return;
        }

        if (buttonsCreated) {
            buttonsCreated = false;
            logger.debug('Container disappeared, waiting for reappear');
        }
    }, 500);
}

export function stopWaitingForSettings(): void {
    if (containerCheckInterval) {
        clearInterval(containerCheckInterval);
        containerCheckInterval = null;
        buttonsCreated = false;
        logger.debug('Stopped waiting for settings container');
    }
}