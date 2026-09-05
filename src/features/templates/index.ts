// src/features/templates/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qs, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { getAllTemplates } from './storage';
import { Template } from './types';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let suggestionsContainer: HTMLElement | null = null;
let currentInput: HTMLElement | null = null;
let lastCommand = '';

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
// СОЗДАНИЕ UI ПОДСКАЗОК (ДИЗАЙН КАК В НАСТРОЙКАХ)
// ============================================================

function createSuggestions(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'kmod-suggestions';
    container.style.cssText = `
        position: fixed;
        background: #313338;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.04);
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        z-index: 999999;
        display: none;
        overflow: hidden;
        min-width: 200px;
        max-width: 380px;
        max-height: 200px;
        overflow-y: auto;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 4px 0;
    `;

    // Стили для скролла
    container.style.scrollbarWidth = 'thin';
    container.style.scrollbarColor = '#1e1f22 transparent';
    
    return container;
}

function renderSuggestions(container: HTMLElement, templates: Template[]): void {
    container.innerHTML = '';
    
    if (templates.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = `
            padding: 12px 16px;
            color: #949ba4;
            font-size: 13px;
            font-weight: 500;
            text-align: center;
        `;
        empty.textContent = 'Нет шаблонов';
        container.appendChild(empty);
        return;
    }
    
    for (const template of templates) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.15s;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        `;
        item.onmouseenter = () => {
            item.style.background = '#3f4147';
        };
        item.onmouseleave = () => {
            item.style.background = 'transparent';
        };
        item.onclick = () => {
            insertTemplate(template);
        };
        
        // Команда (зелёная, жирная)
        const command = document.createElement('span');
        command.style.cssText = `
            color: #4ade80;
            font-weight: 700;
            font-size: 13px;
            font-family: 'JetBrains Mono', monospace;
            flex-shrink: 0;
            background: rgba(74, 222, 128, 0.08);
            padding: 2px 8px;
            border-radius: 4px;
        `;
        command.textContent = template.command;
        
        // Текст (серый)
        const text = document.createElement('span');
        text.style.cssText = `
            color: #dbdee1;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        text.textContent = template.text;
        
        item.appendChild(command);
        item.appendChild(text);
        container.appendChild(item);
    }
}

function positionSuggestions(container: HTMLElement, input: HTMLElement): void {
    const rect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Контейнер будет справа снизу от инпута
    const containerWidth = Math.min(380, viewportWidth - 40);
    const containerHeight = Math.min(200, viewportHeight - 200);
    
    // Позиция: справа от инпута, чуть ниже
    let left = rect.right - containerWidth - 12;
    if (left < 12) left = 12;
    
    let top = rect.bottom + 8;
    if (top + containerHeight + 20 > viewportHeight) {
        // Если снизу не влезает, показываем сверху
        top = rect.top - containerHeight - 8;
        if (top < 12) top = 12;
    }
    
    container.style.width = containerWidth + 'px';
    container.style.maxHeight = Math.min(200, viewportHeight - top - 20) + 'px';
    container.style.left = left + 'px';
    container.style.top = top + 'px';
}

function insertTemplate(template: Template): void {
    if (!currentInput) return;
    
    const input = currentInput as HTMLElement;
    
    // 1. Фокусируемся на поле
    input.focus();
    
    // 2. Удаляем команду из текста (оставляем только текст шаблона)
    // Очищаем поле полностью
    clearLexicalInput(input);
    
    // 3. Вставляем текст через paste событие
    const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData?.setData('text/plain', template.text);
    input.dispatchEvent(pasteEvent);
    
    // 4. Триггерим input событие для обновления UI
    setTimeout(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 10);
    
    hideSuggestions();
    logger.debug(`📝 Template inserted: ${template.command}`);
}

function clearLexicalInput(input: HTMLElement): void {
    // Для Lexical Editor нужно очистить через innerHTML
    // Находим родительский блок
    const lexicalBlock = input.closest('.contenteditable.svelte-1k31az8') || input;
    
    // Очищаем содержимое
    lexicalBlock.innerHTML = '<p class="paragraph" dir="auto"><br></p>';
    
    // Триггерим событие input
    lexicalBlock.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Обновляем ссылку на currentInput
    currentInput = lexicalBlock as HTMLElement;
}

function showSuggestions(container: HTMLElement, input: HTMLElement): void {
    positionSuggestions(container, input);
    container.style.display = 'block';
    currentInput = input;
}

function hideSuggestions(): void {
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
        currentInput = null;
        lastCommand = '';
    }
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

function processInput(input: HTMLElement): void {
    if (!input) return;
    
    const text = input.textContent || '';
    
    if (!text.startsWith('/')) {
        hideSuggestions();
        return;
    }
    
    const match = text.match(/^\/(\w*)/);
    if (!match) {
        hideSuggestions();
        return;
    }
    
    const command = match[1] || '';
    const fullCommand = '/' + command;
    
    const allTemplates = getAllTemplates();
    const filtered = allTemplates.filter(t => 
        t.command.toLowerCase().startsWith(fullCommand.toLowerCase())
    );
    
    if (filtered.length === 0) {
        hideSuggestions();
        return;
    }
    
    if (!suggestionsContainer) {
        suggestionsContainer = createSuggestions();
        document.body.appendChild(suggestionsContainer);
    }
    
    renderSuggestions(suggestionsContainer, filtered);
    showSuggestions(suggestionsContainer, input);
    lastCommand = fullCommand;
}

function setupInputListener(): void {
    const input = findComposerInput();
    if (!input) {
        return;
    }
    
    input.removeEventListener('input', inputHandler);
    input.addEventListener('input', inputHandler);
    
    input.removeEventListener('blur', blurHandler);
    input.addEventListener('blur', blurHandler);
}

function inputHandler(e: Event): void {
    const input = e.target as HTMLElement;
    if (input) processInput(input);
}

function blurHandler(): void {
    setTimeout(hideSuggestions, 200);
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
    
    hideSuggestions();
    if (suggestionsContainer) {
        suggestionsContainer.remove();
        suggestionsContainer = null;
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