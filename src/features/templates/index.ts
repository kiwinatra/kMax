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
// ПОИСК ПОЛЯ ВВОДА
// ============================================================

function findComposerInput(): HTMLElement | null {
    const selectors = [
        OFFSETS.classes.composerInput,
        '.contenteditable.svelte-1k31az8',
        '.composer [contenteditable="true"]',
        '[contenteditable="true"]',
    ];
    
    for (const selector of selectors) {
        const el = qs<HTMLElement>(selector);
        if (el) return el;
    }
    return null;
}

// ============================================================
// ВСТАВКА ШАБЛОНА (100% рабочий способ)
// ============================================================

function insertTemplate(template: Template): void {
    const input = findComposerInput();
    if (!input) {
        logger.warn('Поле ввода не найдено');
        return;
    }

    // Фокусируемся
    input.focus();

    // 1. Очищаем поле через innerHTML (самый надёжный способ)
    // Создаём пустой параграф, чтобы Lexical не сломался
    input.innerHTML = '<p class="paragraph" dir="auto"><br></p>';

    // 2. Вставляем текст через execCommand (работает всегда!)
    document.execCommand('insertText', false, template.text);

    // 3. Триггерим событие для обновления UI
    input.dispatchEvent(new Event('input', { bubbles: true }));

    logger.debug(`📝 Template inserted: ${template.command}`);
}

// ============================================================
// ОБРАБОТКА ВВОДА
// ============================================================

function processInput(input: HTMLElement): void {
    if (!input) return;

    const text = input.textContent || '';
    if (!text.startsWith('/')) return;

    const match = text.match(/^\/(\w*)/);
    if (!match) return;

    const fullCommand = '/' + match[1];
    const allTemplates = getAllTemplates();
    const template = allTemplates.find(t =>
        t.command.toLowerCase() === fullCommand.toLowerCase()
    );

    if (!template) return;

    // Показываем стандартный confirm (всегда работает)
    if (confirm(`Вставить шаблон "${template.command}"?\n\n${template.text}`)) {
        insertTemplate(template);
    } else {
        // Если отмена — просто удаляем команду из поля
        input.innerHTML = '<p class="paragraph" dir="auto"><br></p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function setupInputListener(): void {
    const input = findComposerInput();
    if (!input) return;

    input.removeEventListener('input', inputHandler);
    input.addEventListener('input', inputHandler);
}

function inputHandler(e: Event): void {
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