// src/features/chatTags/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { getChatTags, getTagByChatName, getAllTags, saveChatTags } from './storage';
import { ChatTag } from './types';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let processTimeout: number | null = null;
const DEBOUNCE_DELAY = 300;

// Кеш уже обработанных чатов
const processedChats = new WeakSet<HTMLElement>();

function findChatItems(): HTMLElement[] {
    const selectors = [
        OFFSETS.classes.chatItem,
        '.wrapper.svelte-q2jdqb',
        '.cell.svelte-q2jdqb',
    ];
    
    for (const selector of selectors) {
        const items = qsa<HTMLElement>(selector);
        if (items.length > 0) return items;
    }
    return [];
}

function getChatTitle(chatElement: HTMLElement): string {
    const selectors = [
        OFFSETS.classes.chatItemTitle,
        '.cell .title.svelte-q2jdqb .text.svelte-1riu5uh',
        '.cell .title .text',
        '.title .text',
    ];
    
    for (const selector of selectors) {
        const titleEl = chatElement.querySelector(selector);
        if (titleEl) {
            return titleEl.textContent?.trim() || '';
        }
    }
    
    const titleEl = chatElement.querySelector('.title');
    if (titleEl) {
        return titleEl.textContent?.trim() || '';
    }
    
    return '';
}

function getChatContainer(chatElement: HTMLElement): HTMLElement | null {
    const selectors = [
        '.cell .title.svelte-q2jdqb',
        '.cell .title',
        '.title',
    ];
    
    for (const selector of selectors) {
        const container = chatElement.querySelector<HTMLElement>(selector);
        if (container) return container;
    }
    return null;
}

function createTagElement(tag: ChatTag): HTMLElement {
    const tagEl = document.createElement('span');
    tagEl.className = 'kmod-chat-tag';
    tagEl.style.cssText = `
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        background: ${tag.color};
        padding: 2px 10px;
        border-radius: 12px;
        margin-left: 8px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        vertical-align: middle;
        line-height: 18px;
        user-select: none;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    tagEl.textContent = tag.tagName;
    tagEl.title = `Тег: ${tag.tagName}\nЧат: ${tag.chatName}`;
    return tagEl;
}

function applyTagToChat(chatElement: HTMLElement): void {
    if (processedChats.has(chatElement)) return;
    
    const title = getChatTitle(chatElement);
    if (!title) return;
    
    const tag = getTagByChatName(title);
    if (!tag) return;
    
    const container = getChatContainer(chatElement);
    if (!container) return;
    
    if (container.querySelector('.kmod-chat-tag')) return;
    
    const tagEl = createTagElement(tag);
    container.appendChild(tagEl);
    processedChats.add(chatElement);
    
    logger.debug(`🏷️ Tag "${tag.tagName}" applied to chat: ${title}`);
}

function processPage(): void {
    const settings = getChatTags();
    if (!settings.enabled) return;
    if (settings.tags.length === 0) return;
    
    const chatItems = findChatItems();
    if (chatItems.length === 0) return;
    
    let applied = 0;
    for (const chat of chatItems) {
        if (!processedChats.has(chat)) {
            applyTagToChat(chat);
            applied++;
        }
    }
    
    if (applied > 0) {
        logger.debug(`🏷️ Applied ${applied} chat tags`);
    }
}

function debouncedProcess(): void {
    if (processTimeout) {
        clearTimeout(processTimeout);
    }
    processTimeout = window.setTimeout(() => {
        processTimeout = null;
        processPage();
    }, DEBOUNCE_DELAY);
}

export function apply(): void {
    processPage();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('🏷️ Chat tags enabled');
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
    if (processTimeout) {
        clearTimeout(processTimeout);
        processTimeout = null;
    }
    document.querySelectorAll('.kmod-chat-tag').forEach(el => el.remove());
    logger.info('🏷️ Chat tags disabled');
}

export function toggle(): boolean {
    const settings = getChatTags();
    const newState = !settings.enabled;
    settings.enabled = newState;
    saveChatTags(settings);
    if (newState) enable(); else disable();
    return newState;
}

// ===== ИСПРАВЛЕНО: isFeatureEnabled вместо isEnabled =====
export function isFeatureEnabled(): boolean {
    return isEnabled;
}

// Очистка
window.addEventListener('beforeunload', () => {
    if (unwatch) { unwatch(); unwatch = null; }
});