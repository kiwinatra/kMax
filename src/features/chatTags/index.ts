/*
* @author: potemk.in
* @brief: Applies colored tags to chats based on their title.
* @desc: Pure apply-based feature. Registry triggers apply() when chat nodes appear in the DOM batch. Idempotent via WeakSet of processed chat elements and per-container tag check. Enabled state lives inside ChatTagSettings (not a plain boolean). No local observer, no timers.
*/

import { logger } from '../../core/logger';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { getChatTags, getTagByChatName, saveChatTags } from './storage';
import { ChatTag } from './types';

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
let processedChats = new WeakSet<HTMLElement>();

const CHAT_SELECTORS = [
    OFFSETS.classes.chatItem,
    '.wrapper.svelte-q2jdqb',
    '.cell.svelte-q2jdqb',
];

const TITLE_SELECTORS = [
    OFFSETS.classes.chatItemTitle,
    '.cell .title.svelte-q2jdqb .text.svelte-1riu5uh',
    '.cell .title .text',
    '.title .text',
];

const CONTAINER_SELECTORS = [
    '.cell .title.svelte-q2jdqb',
    '.cell .title',
    '.title',
];

// ============================================================
// DOM HELPERS
// ============================================================

function findChatItems(): HTMLElement[] {
    for (const selector of CHAT_SELECTORS) {
        const items = qsa<HTMLElement>(selector);
        if (items.length > 0) return items;
    }
    return [];
}

function getChatTitle(chatElement: HTMLElement): string {
    for (const selector of TITLE_SELECTORS) {
        const el = chatElement.querySelector(selector);
        if (el) return el.textContent?.trim() || '';
    }
    const titleEl = chatElement.querySelector('.title');
    return titleEl ? titleEl.textContent?.trim() || '' : '';
}

function getChatContainer(chatElement: HTMLElement): HTMLElement | null {
    for (const selector of CONTAINER_SELECTORS) {
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

// ============================================================
// APPLICATION
// ============================================================

function applyTagToChat(chatElement: HTMLElement): boolean {
    if (processedChats.has(chatElement)) return false;

    const title = getChatTitle(chatElement);
    if (!title) return false;

    const tag = getTagByChatName(title);
    if (!tag) return false;

    const container = getChatContainer(chatElement);
    if (!container) return false;

    if (container.querySelector('.kmod-chat-tag')) {
        processedChats.add(chatElement);
        return false;
    }

    container.appendChild(createTagElement(tag));
    processedChats.add(chatElement);
    logger.debug(`🏷️ Tag "${tag.tagName}" applied to chat: ${title}`);
    return true;
}

function processPage(): void {
    const settings = getChatTags();
    if (!settings.enabled) return;
    if (settings.tags.length === 0) return;

    const chatItems = findChatItems();
    if (chatItems.length === 0) return;

    let applied = 0;
    for (const chat of chatItems) {
        if (applyTagToChat(chat)) applied++;
    }

    if (applied > 0) {
        logger.debug(`🏷️ Applied ${applied} chat tags`);
    }
}

function removeAllTags(): void {
    document.querySelectorAll('.kmod-chat-tag').forEach((el) => el.remove());
    processedChats = new WeakSet();
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — reads current ChatTagSettings and applies matching tags. */
export function apply(): void {
    if (!getChatTags().enabled) {
        removeAllTags();
        return;
    }
    processPage();
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    const settings = getChatTags();
    if (!settings.enabled) {
        settings.enabled = true;
        saveChatTags(settings);
    }

    logger.info('🏷️ Chat tags enabled');
    processPage();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    const settings = getChatTags();
    if (settings.enabled) {
        settings.enabled = false;
        saveChatTags(settings);
    }

    removeAllTags();
    logger.info('🏷️ Chat tags disabled');
}

export function toggle(): boolean {
    const settings = getChatTags();
    const newState = !settings.enabled;
    settings.enabled = newState;
    saveChatTags(settings);

    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        processedChats = new WeakSet();
    });
}