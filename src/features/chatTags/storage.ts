/*
* @author: potemk.in
* @brief: Persistence for chat tags.
* @desc: Reads/writes ChatTagSettings to localStorage via the central storage layer.
*       Default settings are created fresh on each call — never shared by reference.
*       Feature is off by default (matches registry FEATURES.chatTags.default = false).
*/

import { storage } from '../../core/storage';
import { ChatTag, ChatTagSettings } from './types';

const STORAGE_KEY = 'chatTags';

function createDefaultSettings(): ChatTagSettings {
    return {
        tags: [],
        enabled: false,
    };
}

// ============================================================
// READ / WRITE
// ============================================================

export function getChatTags(): ChatTagSettings {
    try {
        const data = storage.get<ChatTagSettings>(STORAGE_KEY);
        if (data && Array.isArray(data.tags)) {
            return {
                tags: data.tags,
                enabled: typeof data.enabled === 'boolean' ? data.enabled : false,
            };
        }
        return createDefaultSettings();
    } catch {
        return createDefaultSettings();
    }
}

export function saveChatTags(settings: ChatTagSettings): void {
    storage.set(STORAGE_KEY, settings);
}

// ============================================================
// TAG CRUD
// ============================================================

export function addTag(tag: ChatTag): void {
    const settings = getChatTags();
    settings.tags.push(tag);
    saveChatTags(settings);
}

export function removeTag(tagId: string): void {
    const settings = getChatTags();
    settings.tags = settings.tags.filter((t) => t.id !== tagId);
    saveChatTags(settings);
}

export function updateTag(tagId: string, updates: Partial<ChatTag>): void {
    const settings = getChatTags();
    const index = settings.tags.findIndex((t) => t.id === tagId);
    if (index === -1) return;
    settings.tags[index] = { ...settings.tags[index], ...updates };
    saveChatTags(settings);
}

// ============================================================
// LOOKUPS
// ============================================================

export function getTagByChatName(chatName: string): ChatTag | undefined {
    if (!chatName) return undefined;
    const lower = chatName.toLowerCase();
    return getChatTags().tags.find((t) => t.chatName.toLowerCase() === lower);
}

export function getTagsByChatName(chatName: string): ChatTag[] {
    if (!chatName) return [];
    const lower = chatName.toLowerCase();
    return getChatTags().tags.filter((t) => t.chatName.toLowerCase().includes(lower));
}

export function getAllTags(): ChatTag[] {
    return getChatTags().tags;
}

// ============================================================
// CLEANUP / HELPERS
// ============================================================

export function clearAllTags(): void {
    saveChatTags(createDefaultSettings());
}

export function generateTagId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}