/*
* @author: potemk.in
* @brief: Tag manager modal — create, edit, delete, list chat tags.
* @desc: Refactored into small focused pieces. No duplicated edit/delete
*       handlers. Uses CSS classes instead of inline styles where it matters.
*       All user-provided text goes through textContent (no innerHTML injection).
*/

import { createElement } from '../../core/dom';
import { logger } from '../../core/logger';
import { getAllTags, addTag, updateTag, removeTag, generateTagId } from './storage';
import { ChatTag } from './types';

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

const OVERLAY_CLASS = 'kmod-tag-manager-overlay';
const FORM_CLASS = 'kmod-tag-form';

const STYLE_ID = 'kmod-tag-manager-styles';

const CSS = `
.${OVERLAY_CLASS} {
    position: fixed; inset: 0;
    background: rgba(10, 10, 15, 0.85);
    display: flex; justify-content: center; align-items: center;
    z-index: 999999;
    backdrop-filter: blur(8px);
    animation: kmodTagFade 0.2s ease;
}
@keyframes kmodTagFade {
    from { opacity: 0; } to { opacity: 1; }
}
.kmod-tag-manager-modal {
    background: #0a0a0f;
    border-radius: 24px;
    padding: 32px;
    max-width: 600px; width: 92%;
    max-height: 80vh; overflow-y: auto;
    border: 1px solid rgba(255,255,255,0.04);
    box-shadow: 0 40px 120px rgba(0,0,0,0.8);
    color: #f0f0f0;
    font-family: 'Inter', -apple-system, sans-serif;
}
.kmod-tag-manager-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px;
}
.kmod-tag-manager-title {
    font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.5px;
}
.kmod-tag-manager-close {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.3);
    width: 36px; height: 36px; border-radius: 50%;
    cursor: pointer; font-size: 18px;
    transition: all 0.2s;
}
.kmod-tag-manager-close:hover {
    color: #fff; border-color: rgba(255,255,255,0.15);
}
.kmod-tag-list { margin-bottom: 20px; max-height: 300px; overflow-y: auto; }
.kmod-tag-empty {
    text-align: center; color: rgba(255,255,255,0.2);
    padding: 40px 0; font-size: 14px;
}
.kmod-tag-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; margin-bottom: 8px;
    background: rgba(255,255,255,0.02);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.03);
    transition: background 0.2s;
}
.kmod-tag-item:hover { background: rgba(255,255,255,0.04); }
.kmod-tag-item-info {
    display: flex; align-items: center; gap: 12px;
    flex: 1; min-width: 0;
}
.kmod-tag-color-dot {
    width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
}
.kmod-tag-item-text { display: flex; flex-direction: column; min-width: 0; }
.kmod-tag-item-name { font-weight: 700; font-size: 14px; color: #f0f0f0; }
.kmod-tag-item-chat { font-size: 12px; color: rgba(255,255,255,0.3); }
.kmod-tag-item-actions { display: flex; gap: 6px; }
.kmod-tag-icon-btn {
    background: transparent; border: none;
    color: rgba(255,255,255,0.2);
    cursor: pointer; padding: 4px 8px; border-radius: 6px;
    font-size: 12px; transition: color 0.2s;
}
.kmod-tag-icon-btn:hover { color: rgba(255,255,255,0.6); }
.kmod-tag-icon-btn.danger:hover { color: #ef4444; }
.kmod-tag-add-btn {
    background: rgba(255,255,255,0.06);
    border: 1px dashed rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.5);
    padding: 12px 20px; border-radius: 12px;
    cursor: pointer; font-size: 14px; font-weight: 600;
    width: 100%; transition: all 0.2s;
}
.kmod-tag-add-btn:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.25);
}
.${FORM_CLASS} {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
}
.kmod-tag-form-label {
    display: block; font-size: 12px; font-weight: 600;
    color: rgba(255,255,255,0.3);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.kmod-tag-form-input {
    width: 100%; padding: 10px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    color: #f0f0f0; font-size: 14px;
    outline: none; box-sizing: border-box;
    transition: border-color 0.2s;
    margin-bottom: 10px;
}
.kmod-tag-form-input:focus { border-color: rgba(255,255,255,0.15); }
.kmod-tag-color-grid {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
}
.kmod-tag-color-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer; transition: all 0.2s; padding: 0;
}
.kmod-tag-color-btn.selected { border-color: rgba(255,255,255,0.5); }
.kmod-tag-form-actions { display: flex; gap: 8px; margin-top: 4px; }
.kmod-tag-save-btn {
    flex: 1; padding: 10px;
    background: #4ade80; border: none; border-radius: 8px;
    color: #0a0a0f; font-weight: 700; font-size: 14px;
    cursor: pointer; transition: background 0.2s;
}
.kmod-tag-save-btn:hover { background: #34d399; }
.kmod-tag-cancel-btn {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    color: rgba(255,255,255,0.3);
    font-weight: 600; font-size: 14px;
    cursor: pointer; transition: color 0.2s;
}
.kmod-tag-cancel-btn:hover { color: rgba(255,255,255,0.6); }
`;

// ============================================================
// STATE
// ============================================================

let overlayEl: HTMLDivElement | null = null;

// ============================================================
// STYLES
// ============================================================

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

// ============================================================
// HELPERS
// ============================================================

function randomColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function makeInput(placeholder: string): HTMLInputElement {
    const input = createElement('input', {
        className: 'kmod-tag-form-input',
    }) as HTMLInputElement;
    input.type = 'text';
    input.placeholder = placeholder;
    return input;
}

function makeLabel(text: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'kmod-tag-form-label';
    label.textContent = text;
    return label;
}

// ============================================================
// TAG FORM
// ============================================================

interface TagFormCallbacks {
    onSave: () => void;
    onCancel: () => void;
}

function createTagForm(
    existing: ChatTag | null,
    callbacks: TagFormCallbacks
): HTMLElement {
    const isEdit = existing !== null;
    let selectedColor = existing?.color ?? randomColor();

    const form = document.createElement('div');
    form.className = FORM_CLASS;

    // Chat name
    form.appendChild(makeLabel('Имя чата'));
    const chatInput = makeInput('Например: Анна');
    if (existing) chatInput.value = existing.chatName;
    form.appendChild(chatInput);

    // Tag name
    form.appendChild(makeLabel('Название тега'));
    const tagInput = makeInput('Например: Работа');
    if (existing) tagInput.value = existing.tagName;
    form.appendChild(tagInput);

    // Color
    form.appendChild(makeLabel('Цвет'));
    const colorGrid = document.createElement('div');
    colorGrid.className = 'kmod-tag-color-grid';

    const colorButtons: HTMLButtonElement[] = [];
    for (const color of COLORS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kmod-tag-color-btn';
        btn.style.background = color;
        if (color === selectedColor) btn.classList.add('selected');
        btn.addEventListener('click', () => {
            selectedColor = color;
            for (const b of colorButtons) b.classList.remove('selected');
            btn.classList.add('selected');
        });
        colorButtons.push(btn);
        colorGrid.appendChild(btn);
    }
    form.appendChild(colorGrid);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'kmod-tag-form-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'kmod-tag-save-btn';
    saveBtn.textContent = isEdit ? '💾 Сохранить' : '➕ Добавить';
    saveBtn.addEventListener('click', () => {
        const chatName = chatInput.value.trim();
        const tagName = tagInput.value.trim();

        if (!chatName || !tagName) {
            alert('Заполните все поля!');
            return;
        }

        if (isEdit && existing) {
            updateTag(existing.id, { chatName, tagName, color: selectedColor });
        } else {
            addTag({
                id: generateTagId(),
                chatName,
                tagName,
                color: selectedColor,
                createdAt: Date.now(),
            });
        }

        callbacks.onSave();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'kmod-tag-cancel-btn';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', callbacks.onCancel);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    form.appendChild(actions);

    return form;
}

// ============================================================
// TAG LIST
// ============================================================

function createTagItem(tag: ChatTag, onChanged: () => void): HTMLElement {
    const item = document.createElement('div');
    item.className = 'kmod-tag-item';

    // Info side
    const info = document.createElement('div');
    info.className = 'kmod-tag-item-info';

    const dot = document.createElement('span');
    dot.className = 'kmod-tag-color-dot';
    dot.style.background = tag.color;

    const text = document.createElement('div');
    text.className = 'kmod-tag-item-text';

    const nameEl = document.createElement('span');
    nameEl.className = 'kmod-tag-item-name';
    nameEl.textContent = tag.tagName;

    const chatEl = document.createElement('span');
    chatEl.className = 'kmod-tag-item-chat';
    chatEl.textContent = `Чат: ${tag.chatName}`;

    text.appendChild(nameEl);
    text.appendChild(chatEl);
    info.appendChild(dot);
    info.appendChild(text);

    // Actions side
    const actions = document.createElement('div');
    actions.className = 'kmod-tag-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'kmod-tag-icon-btn';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => {
        // Only one form open at a time
        document.querySelectorAll(`.${FORM_CLASS}`).forEach((f) => f.remove());

        const form = createTagForm(tag, {
            onSave: () => {
                form.remove();
                onChanged();
            },
            onCancel: () => form.remove(),
        });
        item.parentElement?.insertBefore(form, item);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'kmod-tag-icon-btn danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => {
        if (!confirm(`Удалить тег "${tag.tagName}"?`)) return;
        removeTag(tag.id);
        onChanged();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    return item;
}

function renderTagList(container: HTMLElement): void {
    const tags = getAllTags();
    container.innerHTML = '';

    if (tags.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'kmod-tag-empty';
        empty.textContent = 'Нет тегов. Создайте первый!';
        container.appendChild(empty);
        return;
    }

    const onChanged = () => renderTagList(container);
    for (const tag of tags) {
        container.appendChild(createTagItem(tag, onChanged));
    }
}

// ============================================================
// MODAL
// ============================================================

function closeModal(): void {
    if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
    }
}

export function openTagManager(): void {
    if (overlayEl) closeModal();
    ensureStyles();

    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;

    const modal = document.createElement('div');
    modal.className = 'kmod-tag-manager-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'kmod-tag-manager-header';

    const title = document.createElement('h2');
    title.className = 'kmod-tag-manager-title';
    title.textContent = '🏷️ Теги чатов';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kmod-tag-manager-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closeModal);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // List
    const listContainer = document.createElement('div');
    listContainer.className = 'kmod-tag-list';

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'kmod-tag-add-btn';
    addBtn.textContent = '+ Добавить тег';
    addBtn.addEventListener('click', () => {
        document.querySelectorAll(`.${FORM_CLASS}`).forEach((f) => f.remove());
        const form = createTagForm(null, {
            onSave: () => {
                form.remove();
                renderTagList(listContainer);
            },
            onCancel: () => form.remove(),
        });
        modal.insertBefore(form, addBtn);
    });

    modal.appendChild(header);
    modal.appendChild(listContainer);
    modal.appendChild(addBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlayEl = overlay;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    renderTagList(listContainer);
    logger.debug('🏷️ Tag manager opened');
}

// ============================================================
// CLEANUP
// ============================================================

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        closeModal();
    });
}