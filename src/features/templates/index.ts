// src/features/templates/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qs, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';
import { getAllTemplates, getTemplateByCommand } from './storage';
import { Template } from './types';

let isEnabled = false;
let unwatch: (() => void) | null = null;
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
// МОДАЛЬНОЕ ОКНО С ШАБЛОНОМ
// ============================================================

function showTemplateModal(template: Template): void {
    // Удаляем старую модалку, если есть
    const oldModal = document.querySelector('.kmod-template-modal');
    if (oldModal) oldModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'kmod-template-modal';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999999;
        backdrop-filter: blur(4px);
        animation: kmodFadeScale 0.15s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #313338;
        border-radius: 12px;
        padding: 28px 32px;
        max-width: 480px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #dbdee1;
        animation: kmodFadeScale 0.15s ease;
    `;

    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 18px;
        font-weight: 700;
        color: #f2f3f5;
        margin-bottom: 4px;
    `;
    title.textContent = '📝 Вставить шаблон';

    // Команда
    const commandBlock = document.createElement('div');
    commandBlock.style.cssText = `
        background: rgba(74, 222, 128, 0.08);
        border-radius: 6px;
        padding: 4px 12px;
        display: inline-block;
        margin: 8px 0 12px 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #4ade80;
    `;
    commandBlock.textContent = template.command;

    // Текст шаблона (большой блок)
    const textBlock = document.createElement('div');
    textBlock.style.cssText = `
        background: #2b2d31;
        border-radius: 8px;
        padding: 14px 16px;
        margin: 12px 0 20px 0;
        font-size: 15px;
        line-height: 1.6;
        color: #dbdee1;
        border: 1px solid #1e1f22;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
    `;
    textBlock.textContent = template.text;

    // Кнопки
    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
        padding: 8px 20px;
        border-radius: 8px;
        border: none;
        background: #4e5058;
        color: #f2f3f5;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    `;
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#6d6f78'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#4e5058'; };
    cancelBtn.onclick = () => {
        overlay.remove();
        // Возвращаем курсор в поле
        if (currentInput) {
            currentInput.focus();
        }
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = `
        padding: 8px 24px;
        border-radius: 8px;
        border: none;
        background: #4ade80;
        color: #0a0a0f;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
    `;
    confirmBtn.textContent = '✅ Вставить';
    confirmBtn.onmouseenter = () => { confirmBtn.style.background = '#34d399'; };
    confirmBtn.onmouseleave = () => { confirmBtn.style.background = '#4ade80'; };
    confirmBtn.onclick = () => {
        overlay.remove();
        insertTemplate(template);
    };

    btnWrapper.appendChild(cancelBtn);
    btnWrapper.appendChild(confirmBtn);

    modal.appendChild(title);
    modal.appendChild(commandBlock);
    modal.appendChild(textBlock);
    modal.appendChild(btnWrapper);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Закрытие по клику на оверлей
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (currentInput) {
                currentInput.focus();
            }
        }
    });

    // Закрытие по Escape
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            overlay.remove();
            if (currentInput) {
                currentInput.focus();
            }
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// ВСТАВКА ШАБЛОНА
// ============================================================

function insertTemplate(template: Template): void {
    if (!currentInput) return;
    
    const input = currentInput as HTMLElement;
    input.focus();
    
    // Очищаем поле (рабочий способ через Ctrl+A + Backspace)
    clearLexicalInput(input);
    
    // Вставляем текст через paste
    const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData?.setData('text/plain', template.text);
    input.dispatchEvent(pasteEvent);
    
    setTimeout(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 10);
    
    logger.debug(`📝 Template inserted: ${template.command}`);
}

function clearLexicalInput(input: HTMLElement): void {
    try {
        input.focus();
        
        // Выделяем весь текст (Ctrl+A)
        const sel = window.getSelection();
        if (!sel) {
            // fallback
            input.innerHTML = '<p class="paragraph" dir="auto"><br></p>';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        const range = document.createRange();
        range.selectNodeContents(input);
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Симулируем Backspace
        const backspaceEvent = new KeyboardEvent('keydown', {
            key: 'Backspace',
            bubbles: true,
            cancelable: true
        });
        input.dispatchEvent(backspaceEvent);
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
        // fallback
        input.innerHTML = '<p class="paragraph" dir="auto"><br></p>';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// ============================================================
// ОБРАБОТКА ВВОДА
// ============================================================

function processInput(input: HTMLElement): void {
    if (!input) return;
    
    const text = input.textContent || '';
    
    // Проверяем, начинается ли с "/" и совпадает ли с командой
    if (!text.startsWith('/')) return;
    
    // Извлекаем команду
    const match = text.match(/^\/(\w*)/);
    if (!match) return;
    
    const fullCommand = '/' + match[1];
    
    // Ищем точное совпадение команды (не префикс)
    const allTemplates = getAllTemplates();
    const template = allTemplates.find(t => 
        t.command.toLowerCase() === fullCommand.toLowerCase()
    );
    
    if (!template) return;
    
    // Сохраняем текущее поле ввода
    currentInput = input;
    
    // Показываем модалку
    showTemplateModal(template);
    
    // Очищаем поле от команды (чтобы не оставалось /kmax)
    clearLexicalInput(input);
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