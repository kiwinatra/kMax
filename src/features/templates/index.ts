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
let modalOpen = false; // флаг, чтобы не спамить модалками

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
// МОДАЛЬНОЕ ОКНО
// ============================================================

function showTemplateModal(template: Template): void {
    if (modalOpen) return; // если уже открыта — не открываем новую
    modalOpen = true;

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

    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 18px;
        font-weight: 700;
        color: #f2f3f5;
        margin-bottom: 4px;
    `;
    title.textContent = '📝 Шаблон';

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

    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
    `;

    // Кнопка "Копировать"
    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = `
        padding: 8px 20px;
        border-radius: 8px;
        border: none;
        background: #5865f2;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    `;
    copyBtn.textContent = '📋 Копировать';
    copyBtn.onmouseenter = () => { copyBtn.style.background = '#4752c4'; };
    copyBtn.onmouseleave = () => { copyBtn.style.background = '#5865f2'; };
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(template.text).then(() => {
            copyBtn.textContent = '✅ Скопировано!';
            setTimeout(() => { copyBtn.textContent = '📋 Копировать'; }, 2000);
        }).catch(() => {
            alert('Не удалось скопировать текст');
        });
    };

    // Кнопка "Закрыть"
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
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
    closeBtn.textContent = 'Закрыть';
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#6d6f78'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = '#4e5058'; };
    closeBtn.onclick = () => {
        overlay.remove();
        modalOpen = false;
    };

    // Кнопка "Вставить" (не работает)
    const insertBtn = document.createElement('button');
    insertBtn.style.cssText = `
        padding: 8px 20px;
        border-radius: 8px;
        border: none;
        background: #4e5058;
        color: #f2f3f5;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        opacity: 0.5;
    `;
    insertBtn.textContent = 'Вставить (не работает)';
    insertBtn.onclick = () => {
        alert('❌ Вставка не работает, простите :(\nПожалуйста, используйте кнопку "Копировать" и вставьте вручную.');
    };

    btnWrapper.appendChild(copyBtn);
    btnWrapper.appendChild(insertBtn);
    btnWrapper.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(commandBlock);
    modal.appendChild(textBlock);
    modal.appendChild(btnWrapper);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Закрытие по клику на фон
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            modalOpen = false;
        }
    });

    // Закрытие по Escape
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            overlay.remove();
            modalOpen = false;
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// ОБРАБОТКА ВВОДА
// ============================================================

function processInput(input: HTMLElement): void {
    if (!input) return;
    if (modalOpen) return; // если модалка открыта — игнорируем

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

    // Показываем модалку
    showTemplateModal(template);
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

    const modal = document.querySelector('.kmod-template-modal');
    if (modal) modal.remove();
    modalOpen = false;

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