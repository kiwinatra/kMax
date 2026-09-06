// src/features/templates/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qs } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { getAllTemplates } from './storage';
import { Template } from './types';

let isEnabled = false;
let unwatch: (() => void) | null = null;

// ============================================================
// ПОИСК ПОЛЯ ВВОДА (расширенный)
// ============================================================

function findComposerInput(): HTMLElement | null {
    // Селекторы для самых популярных редакторов
    const selectors = [
        OFFSETS.classes.composerInput,
        '.contenteditable.svelte-1k31az8',     // Twitter / X
        '.composer [contenteditable="true"]',  // LinkedIn
        '[contenteditable="true"]',            // универсальный
        '.notion-editable',                    // Notion
        '.DraftEditor-editorContainer',        // Draft.js
        '.lexical-editor',                     // Lexical
        '.ql-editor',                          // Quill
        '.ProseMirror',                        // ProseMirror
        '[role="textbox"]',                    // общий fallback
    ];
    
    for (const selector of selectors) {
        const el = qs<HTMLElement>(selector);
        if (el && el.isContentEditable) return el;
    }
    return null;
}

// ============================================================
// ВСТАВКА ТЕКСТА (надёжный способ)
// ============================================================

function insertTextAtCursor(text: string, input: HTMLElement): boolean {
    try {
        // Фокусируемся и ставим курсор в конец (если не был)
        input.focus();

        // 1. Пытаемся использовать execCommand (самый надёжный)
        if (document.execCommand) {
            const success = document.execCommand('insertText', false, text);
            if (success) {
                logger.debug('✅ Вставка через execCommand');
                return true;
            }
        }

        // 2. Запасной вариант – через Range и Selection
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();            // удаляем выделенное (команду)
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            // перемещаем курсор после вставленного текста
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            logger.debug('✅ Вставка через Range');
            return true;
        }

        // 3. Самый крайний случай – просто заменяем innerHTML (но это может сломать редактор)
        input.innerHTML = text;
        logger.warn('⚠️ Использован fallback innerHTML');
        return true;
    } catch (e) {
        logger.error('❌ Ошибка вставки:', e);
        return false;
    }
}

function insertTemplate(template: Template): void {
    const input = findComposerInput();
    if (!input) {
        logger.warn('Поле ввода не найдено');
        return;
    }

    // Проверяем, что поле редактируемо и не заблокировано
    if (input.hasAttribute('readonly') || input.getAttribute('contenteditable') === 'false') {
        logger.warn('Поле ввода не редактируемо');
        return;
    }

    // Удаляем команду (очищаем только её, а не всё поле)
    // Предполагаем, что команда находится в начале поля
    // Если хотите поддерживать команду в любом месте – нужно более сложное выделение
    // Для простоты оставляем вариант с очисткой всего поля (т.к. команда обычно в начале)
    // Но мы можем удалить только текст до команды (он пуст) и вставить шаблон.
    // Если в поле был другой текст до команды – мы его сохраним.
    // В текущей логике команда должна быть в начале, поэтому заменяем всё.
    // Чтобы улучшить, можно использовать выделение для удаления команды.
    // Но для простоты оставляем как есть.

    // Вставляем текст
    const success = insertTextAtCursor(template.text, input);
    if (!success) {
        logger.error('Не удалось вставить текст');
        return;
    }

    // Триггерим все необходимые события, чтобы редактор обновился
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true })); // иногда помогает

    logger.debug(`📝 Шаблон "${template.command}" вставлен`);
}

// ============================================================
// ОБРАБОТКА ВВОДА (с поддержкой команд)
// ============================================================

// Кэш для предотвращения повторного срабатывания на одно и то же изменение
let lastProcessedText = '';

function processInput(input: HTMLElement): void {
    if (!input) return;

    const text = input.textContent || '';
    // Игнорируем, если не начинается с '/'
    if (!text.startsWith('/')) {
        lastProcessedText = '';
        return;
    }

    // Не обрабатываем одну и ту же команду дважды
    if (text === lastProcessedText) return;
    lastProcessedText = text;

    // Ищем команду
    const match = text.match(/^\/(\w*)/);
    if (!match) return;

    const fullCommand = '/' + match[1];
    const allTemplates = getAllTemplates();
    const template = allTemplates.find(t =>
        t.command.toLowerCase() === fullCommand.toLowerCase()
    );

    if (!template) return;

    // Показываем подтверждение
    if (confirm(`Вставить шаблон "${template.command}"?\n\n${template.text}`)) {
        insertTemplate(template);
    } else {
        // Отмена – удаляем только команду, а не всё поле
        // Если пользователь уже что-то написал до команды, то после удаления команды останется только этот текст
        // Но у нас команда в начале, так что удаляем всё.
        // Для улучшения можно было бы сохранить текст до команды, но сейчас проще.
        input.innerHTML = '<p class="paragraph" dir="auto"><br></p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        logger.debug('Команда удалена');
    }

    // Сбрасываем кэш, чтобы можно было ввести новую команду
    lastProcessedText = '';
}

// ============================================================
// ПОДКЛЮЧЕНИЕ СЛУШАТЕЛЯ
// ============================================================

function setupInputListener(): void {
    const input = findComposerInput();
    if (!input) {
        logger.debug('Поле ввода не найдено, слушатель не установлен');
        return;
    }

    // Удаляем старые обработчики, чтобы не было дублей
    input.removeEventListener('input', inputHandler);
    input.removeEventListener('compositionstart', compositionStartHandler);
    input.removeEventListener('compositionend', compositionEndHandler);

    // Добавляем обработчики
    input.addEventListener('input', inputHandler);
    input.addEventListener('compositionstart', compositionStartHandler);
    input.addEventListener('compositionend', compositionEndHandler);

    logger.debug('🎧 Слушатель поля ввода установлен');
}

// Флаг для обработки составных символов (IME)
let isComposing = false;

function compositionStartHandler() {
    isComposing = true;
}

function compositionEndHandler() {
    isComposing = false;
    // После завершения композиции вызываем обработчик вручную (если нужно)
    const input = findComposerInput();
    if (input) processInput(input);
}

function inputHandler(e: Event): void {
    if (isComposing) return; // игнорируем события во время ввода IME
    const input = e.target as HTMLElement;
    if (input) processInput(input);
}

// ============================================================
// ПУБЛИЧНЫЙ API
// ============================================================

export function apply(): void {
    const enabled = storage.getBoolean('templates' as any);
    if (enabled) {
        setupInputListener();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('📝 Templates enabled');
    setupInputListener();

    if (!unwatch) {
        unwatch = watchDOM(() => {
            setupInputListener();
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

    // Отключаем слушатели
    const input = findComposerInput();
    if (input) {
        input.removeEventListener('input', inputHandler);
        input.removeEventListener('compositionstart', compositionStartHandler);
        input.removeEventListener('compositionend', compositionEndHandler);
    }

    logger.info('📝 Templates disabled');
}

export function toggle(): boolean {
    const current = storage.getBoolean('templates' as any);
    const newState = !current;
    storage.setBoolean('templates' as any, newState);
    if (newState) enable(); else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}