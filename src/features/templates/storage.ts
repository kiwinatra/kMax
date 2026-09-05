// src/features/templates/storage.ts

import { storage } from '../../core/storage';
import { Template, TemplatesSettings } from './types';

const STORAGE_KEY = 'templates';

const DEFAULT_SETTINGS: TemplatesSettings = {
    templates: [],
    enabled: true,
};

export function getTemplates(): TemplatesSettings {
    try {
        const data = storage.get<TemplatesSettings>(STORAGE_KEY as any);
        if (data && Array.isArray(data.templates)) {
            return data;
        }
        return DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveTemplates(settings: TemplatesSettings): void {
    storage.set(STORAGE_KEY as any, settings);
}

export function addTemplate(template: Template): void {
    const settings = getTemplates();
    settings.templates.push(template);
    saveTemplates(settings);
}

export function removeTemplate(templateId: string): void {
    const settings = getTemplates();
    settings.templates = settings.templates.filter(t => t.id !== templateId);
    saveTemplates(settings);
}

export function updateTemplate(templateId: string, updates: Partial<Template>): void {
    const settings = getTemplates();
    const index = settings.templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
        settings.templates[index] = { ...settings.templates[index], ...updates };
        saveTemplates(settings);
    }
}

export function getAllTemplates(): Template[] {
    return getTemplates().templates;
}

export function getTemplateByCommand(command: string): Template | undefined {
    const settings = getTemplates();
    return settings.templates.find(t => t.command.toLowerCase() === command.toLowerCase());
}

export function findTemplatesByCommand(command: string): Template[] {
    const settings = getTemplates();
    return settings.templates.filter(t => t.command.toLowerCase().startsWith(command.toLowerCase()));
}

export function generateTemplateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function clearAllTemplates(): void {
    saveTemplates(DEFAULT_SETTINGS);
}