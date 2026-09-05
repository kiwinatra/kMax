// src/features/chatTags/storage.ts — проверь, что есть все экспорты

import { storage } from '../../core/storage';
import { ChatTag, ChatTagSettings } from './types';

const STORAGE_KEY = 'chatTags';

const DEFAULT_SETTINGS: ChatTagSettings = {
    tags: [],
    enabled: true,
};

export function getChatTags(): ChatTagSettings {
    try {
        const data = storage.get<ChatTagSettings>(STORAGE_KEY as any);
        if (data && Array.isArray(data.tags)) {
            return data;
        }
        return DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveChatTags(settings: ChatTagSettings): void {
    storage.set(STORAGE_KEY as any, settings);
}

export function addTag(tag: ChatTag): void {
    const settings = getChatTags();
    settings.tags.push(tag);
    saveChatTags(settings);
}

export function removeTag(tagId: string): void {
    const settings = getChatTags();
    settings.tags = settings.tags.filter(t => t.id !== tagId);
    saveChatTags(settings);
}

export function updateTag(tagId: string, updates: Partial<ChatTag>): void {
    const settings = getChatTags();
    const index = settings.tags.findIndex(t => t.id === tagId);
    if (index !== -1) {
        settings.tags[index] = { ...settings.tags[index], ...updates };
        saveChatTags(settings);
    }
}

export function getTagByChatName(chatName: string): ChatTag | undefined {
    const settings = getChatTags();
    return settings.tags.find(t => t.chatName.toLowerCase() === chatName.toLowerCase());
}

export function getTagsByChatName(chatName: string): ChatTag[] {
    const settings = getChatTags();
    return settings.tags.filter(t => t.chatName.toLowerCase().includes(chatName.toLowerCase()));
}

export function getAllTags(): ChatTag[] {
    return getChatTags().tags;
}

export function clearAllTags(): void {
    saveChatTags(DEFAULT_SETTINGS);
}

export function generateTagId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}