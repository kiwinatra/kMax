/*
* @author: potemk.in
* @brief: Persistence for quick reply templates.
* @desc: Reads/writes TemplatesSettings to localStorage. Default settings are
*       created fresh on each call. Feature is off by default (matches registry
*       FEATURES.templates.default = false).
*/

import { storage } from '../../core/storage';
import { Template, TemplatesSettings } from './types';

const STORAGE_KEY = 'templates';

function createDefaultSettings(): TemplatesSettings {
    return {
        templates: [],
        enabled: false,
    };
}

// ============================================================
// READ / WRITE
// ============================================================

export function getTemplates(): TemplatesSettings {
    try {
        const data = storage.get<TemplatesSettings>(STORAGE_KEY);
        if (data && Array.isArray(data.templates)) {
            return {
                templates: data.templates,
                enabled: typeof data.enabled === 'boolean' ? data.enabled : false,
            };
        }
        return createDefaultSettings();
    } catch {
        return createDefaultSettings();
    }
}

export function saveTemplates(settings: TemplatesSettings): void {
    storage.set(STORAGE_KEY, settings);
}

// ============================================================
// TEMPLATE CRUD
// ============================================================

export function addTemplate(template: Template): void {
    const settings = getTemplates();
    settings.templates.push(template);
    saveTemplates(settings);
}

export function removeTemplate(templateId: string): void {
    const settings = getTemplates();
    settings.templates = settings.templates.filter((t) => t.id !== templateId);
    saveTemplates(settings);
}

export function updateTemplate(templateId: string, updates: Partial<Template>): void {
    const settings = getTemplates();
    const index = settings.templates.findIndex((t) => t.id === templateId);
    if (index === -1) return;
    settings.templates[index] = { ...settings.templates[index], ...updates };
    saveTemplates(settings);
}

// ============================================================
// LOOKUPS
// ============================================================

export function getAllTemplates(): Template[] {
    return getTemplates().templates;
}

export function getTemplateByCommand(command: string): Template | undefined {
    if (!command) return undefined;
    const lower = command.toLowerCase();
    return getTemplates().templates.find((t) => t.command.toLowerCase() === lower);
}

export function findTemplatesByCommand(command: string): Template[] {
    if (!command) return [];
    const lower = command.toLowerCase();
    return getTemplates().templates.filter((t) => t.command.toLowerCase().startsWith(lower));
}

// ============================================================
// CLEANUP / HELPERS
// ============================================================

export function generateTemplateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function clearAllTemplates(): void {
    saveTemplates(createDefaultSettings());
}