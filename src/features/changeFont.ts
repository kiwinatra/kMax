// src/features/changeFont.ts

import { storage } from '../core/storage';
import { logger } from '../core/logger';
import { FONTS, FontOption, FontCategory } from '../offsets';

let styleElement: HTMLStyleElement | null = null;
let loadedGoogleFonts = new Set<string>();

// ===== ПОЛУЧЕНИЕ ШРИФТА =====
export function getFontValue(fontLabel: string): string {
    const allFonts = [...FONTS.system, ...FONTS.google];
    const found = allFonts.find(f => f.label === fontLabel);
    return found ? found.value : FONTS.system[0].value;
}

export function getFontByLabel(label: string): FontOption | undefined {
    const allFonts = [...FONTS.system, ...FONTS.google];
    return allFonts.find(f => f.label === label);
}

// ===== ЗАГРУЗКА GOOGLE FONTS =====
function loadGoogleFont(font: FontOption): Promise<void> {
    // Проверяем наличие url
    if (!('url' in font) || !font.url) return Promise.resolve();
    if (loadedGoogleFonts.has(font.label)) return Promise.resolve();

    return new Promise((resolve) => {
        try {
            const existing = document.querySelector(`link[href="${font.url}"]`);
            if (existing) {
                loadedGoogleFonts.add(font.label);
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = font.url;
            link.onload = () => {
                loadedGoogleFonts.add(font.label);
                logger.debug(`📥 Google Font loaded: ${font.label}`);
                resolve();
            };
            link.onerror = () => {
                logger.warn(`⚠️ Failed to load Google Font: ${font.label}`);
                resolve();
            };
            document.head.appendChild(link);
        } catch (error) {
            logger.error(`Error loading font ${font.label}:`, error);
            resolve();
        }
    });
}

// ===== ПРИМЕНЕНИЕ ШРИФТА =====
export async function applyFont(fontFamily: string, fontLabel?: string): Promise<void> {
    if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }

    if (!fontFamily || fontFamily === '') {
        document.body.style.fontFamily = '';
        return;
    }

    if (fontLabel) {
        const font = getFontByLabel(fontLabel);
        if (font && 'url' in font && font.url) {
            await loadGoogleFont(font);
        }
    }

    styleElement = document.createElement('style');
    styleElement.id = 'kmod-font-style';
    styleElement.textContent = `
        * {
            font-family: ${fontFamily} !important;
        }
    `;
    document.head.appendChild(styleElement);
    logger.debug(`🔤 Font applied: ${fontFamily}`);
}

// ===== ПРИМЕНЕНИЕ СОХРАНЁННОГО =====
export async function applyStoredFont(): Promise<void> {
    const savedLabel = storage.get<string>('fontFamily' as any);
    if (savedLabel) {
        const font = getFontByLabel(savedLabel);
        if (font) {
            await applyFont(font.value, savedLabel);
        }
    }
}

// ===== УСТАНОВКА ШРИФТА =====
export async function setFont(fontLabel: string): Promise<void> {
    const font = getFontByLabel(fontLabel);
    if (!font) {
        logger.warn(`Font not found: ${fontLabel}`);
        return;
    }

    storage.set('fontFamily' as any, fontLabel);
    await applyFont(font.value, fontLabel);
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
export function isGoogleFont(label: string): boolean {
    return FONTS.google.some(f => f.label === label);
}

export function getFontCategory(label: string): FontCategory {
    return isGoogleFont(label) ? 'google' : 'system';
}

// ===== ЭКСПОРТ СПИСКОВ =====
export const fontOptions = [...FONTS.system, ...FONTS.google];
export const systemFonts = FONTS.system;
export const googleFonts = FONTS.google;