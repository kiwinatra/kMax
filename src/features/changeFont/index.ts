// src/features/changeFont/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { FONTS } from '../../offsets';

let styleElement: HTMLStyleElement | null = null;

function getFontValue(fontLabel: string): string {
    const allFonts = [...FONTS.system, ...FONTS.google];
    const found = allFonts.find(f => f.label === fontLabel);
    return found ? found.value : FONTS.system[0].value;
}

function applyFont(fontFamily: string): void {
    // Удаляем старый стиль
    if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }

    if (!fontFamily || fontFamily === '') {
        // Сброс к стандартному
        document.body.style.fontFamily = '';
        return;
    }

    // Создаём новый стиль с !important для переопределения всех стилей сайта
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

export function apply(): void {
    const enabled = storage.getBoolean('fontFamily' as any); // но у нас ключ не boolean, а строка
    // На самом деле фича будет всегда включена, но мы храним выбранный шрифт в storage
    // Для единообразия будем использовать отдельный ключ для состояния включено/выключено?
    // Лучше сделать так: фича всегда активна, но если пользователь выбрал шрифт, он применяется.
    // Если пользователь сбросит выбор на "Системный", то шрифт сбрасывается.
    // Поэтому apply будет читать выбранный шрифт из storage и применять.
    const savedFont = storage.get<string>('fontFamily');
    if (savedFont) {
        applyFont(savedFont);
    } else {
        // Если не сохранено, сбрасываем
        applyFont(FONTS.system[0].value); // или сброс
    }
}

export function enable(): void {
    // Эта фича не требует observer, просто применяем шрифт
    apply();
    logger.info('🔤 Font feature enabled');
}

export function disable(): void {
    // Сброс к системному
    applyFont(FONTS.system[0].value);
    storage.remove('fontFamily');
    logger.info('🔤 Font feature disabled (reset to system)');
}

export function toggle(): boolean {
    // В toggle мы переключаем состояние включено/выключено? 
    // Поскольку фича всегда активна, можно просто применять текущий шрифт.
    // Но для совместимости с toggle в UI, мы можем переключать состояние, но лучше использовать отдельный булевый ключ.
    // Однако проще: фича всегда включена, а выбор шрифта - отдельный параметр.
    // Для единообразия создадим ключ 'fontEnabled'?
    // Но пользователь хочет выбирать шрифт из списка, а не включать/выключать.
    // Поэтому в настройках будет просто select с выбором шрифта, и при выборе шрифт применяется.
    // Мы не будем использовать toggle для этой фичи в обычном смысле.
    // Для совместимости с registry, мы можем сделать apply, enable, disable как выше.
    return true;
}