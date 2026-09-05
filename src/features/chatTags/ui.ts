// src/features/chatTags/ui.ts

import { createElement } from '../../core/dom';
import { logger } from '../../core/logger';
import { getLocale } from '../../locales';
import { getChatTags, addTag, removeTag, updateTag, getAllTags, generateTagId } from './storage';
import { ChatTag } from './types';

let modalOverlay: HTMLDivElement | null = null;

const COLORS = [
    '#ef4444', // red
    '#f59e0b', // amber
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
];

function getRandomColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function openTagManager(): void {
    if (modalOverlay) {
        modalOverlay.remove();
        modalOverlay = null;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'kmod-tag-manager-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 15, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        backdrop-filter: blur(8px);
        animation: kmodFadeScale 0.2s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #0a0a0f;
        border-radius: 24px;
        padding: 32px;
        max-width: 600px;
        width: 92%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(255,255,255,0.04);
        box-shadow: 0 40px 120px rgba(0,0,0,0.8);
        color: #f0f0f0;
        font-family: 'Inter', -apple-system, sans-serif;
    `;
    
    // Заголовок
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    `;
    
    const title = document.createElement('h2');
    title.style.cssText = `
        font-size: 24px;
        font-weight: 900;
        margin: 0;
        letter-spacing: -0.5px;
    `;
    title.textContent = '🏷️ Теги чатов';
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.3);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s;
    `;
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => {
        overlay.remove();
        modalOverlay = null;
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    
    // Список тегов
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        margin-bottom: 20px;
        max-height: 300px;
        overflow-y: auto;
    `;
    listContainer.id = 'kmod-tag-list';
    
    // Кнопка добавления
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
        background: rgba(255,255,255,0.06);
        border: 1px dashed rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.5);
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        width: 100%;
        transition: all 0.2s;
    `;
    addBtn.textContent = '+ Добавить тег';
    addBtn.onmouseenter = () => {
        addBtn.style.background = 'rgba(255,255,255,0.08)';
        addBtn.style.borderColor = 'rgba(255,255,255,0.25)';
    };
    addBtn.onmouseleave = () => {
        addBtn.style.background = 'rgba(255,255,255,0.06)';
        addBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    };
    addBtn.onclick = () => {
        // Удаляем старую форму, если есть
        const oldForm = modal.querySelector('.kmod-tag-form');
        if (oldForm) oldForm.remove();
        const form = createTagForm(null, () => {
            renderTagList(listContainer);
        });
        // Вставляем перед кнопкой добавления
        modal.insertBefore(form, addBtn);
    };
    
    modal.appendChild(listContainer);
    modal.appendChild(addBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modalOverlay = overlay;
    
    renderTagList(listContainer);
}

function renderTagList(container: HTMLElement): void {
    const tags = getAllTags();
    container.innerHTML = '';
    
    if (tags.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = `
            text-align: center;
            color: rgba(255,255,255,0.2);
            padding: 40px 0;
            font-size: 14px;
        `;
        empty.textContent = 'Нет тегов. Создайте первый!';
        container.appendChild(empty);
        return;
    }
    
    for (const tag of tags) {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            margin-bottom: 8px;
            background: rgba(255,255,255,0.02);
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.03);
            transition: all 0.2s;
        `;
        item.onmouseenter = () => {
            item.style.background = 'rgba(255,255,255,0.04)';
        };
        item.onmouseleave = () => {
            item.style.background = 'rgba(255,255,255,0.02)';
        };
        
        const info = document.createElement('div');
        info.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
        `;
        
        const colorDot = document.createElement('span');
        colorDot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${tag.color};
            flex-shrink: 0;
        `;
        
        const nameContainer = document.createElement('div');
        nameContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            min-width: 0;
        `;
        
        const tagName = document.createElement('span');
        tagName.style.cssText = `
            font-weight: 700;
            font-size: 14px;
            color: #f0f0f0;
        `;
        tagName.textContent = tag.tagName;
        
        const chatName = document.createElement('span');
        chatName.style.cssText = `
            font-size: 12px;
            color: rgba(255,255,255,0.3);
        `;
        chatName.textContent = `Чат: ${tag.chatName}`;
        
        nameContainer.appendChild(tagName);
        nameContainer.appendChild(chatName);
        
        info.appendChild(colorDot);
        info.appendChild(nameContainer);
        
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 6px;
        `;
        
        const editBtn = document.createElement('button');
        editBtn.style.cssText = `
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.2);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            transition: all 0.2s;
        `;
        editBtn.textContent = '✏️';
        editBtn.onmouseenter = () => { editBtn.style.color = 'rgba(255,255,255,0.6)'; };
        editBtn.onmouseleave = () => { editBtn.style.color = 'rgba(255,255,255,0.2)'; };
        editBtn.onclick = () => {
            // Удаляем старую форму, если есть
            const oldForm = container.closest('.kmod-tag-manager-overlay')?.querySelector('.kmod-tag-form');
            if (oldForm) oldForm.remove();
            const form = createTagForm(tag, () => {
                renderTagList(container);
            });
            // Вставляем перед кнопкой добавления
            const addBtn = container.closest('.kmod-tag-manager-overlay')?.querySelector('button:last-child');
            if (addBtn) {
                addBtn.parentNode?.insertBefore(form, addBtn);
            } else {
                container.parentNode?.appendChild(form);
            }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.style.cssText = `
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.2);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            transition: all 0.2s;
        `;
        deleteBtn.textContent = '🗑️';
        deleteBtn.onmouseenter = () => { deleteBtn.style.color = '#ef4444'; };
        deleteBtn.onmouseleave = () => { deleteBtn.style.color = 'rgba(255,255,255,0.2)'; };
        deleteBtn.onclick = () => {
            if (confirm(`Удалить тег "${tag.tagName}"?`)) {
                removeTag(tag.id);
                renderTagList(container);
            }
        };
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
    }
}

function createTagForm(existingTag: ChatTag | null, onSave: () => void): HTMLElement {
    const form = document.createElement('div');
    form.className = 'kmod-tag-form';
    form.style.cssText = `
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
    `;
    
    const isEdit = existingTag !== null;
    
    const inputStyle = `
        width: 100%;
        padding: 10px 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        color: #f0f0f0;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
        margin-bottom: 10px;
    `;
    
    const labelStyle = `
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255,255,255,0.3);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    
    // Имя чата
    const chatLabel = document.createElement('label');
    chatLabel.style.cssText = labelStyle;
    chatLabel.textContent = 'Имя чата';
    form.appendChild(chatLabel);
    
    const chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.placeholder = 'Например: Анна';
    chatInput.style.cssText = inputStyle;
    if (isEdit) chatInput.value = existingTag.chatName;
    form.appendChild(chatInput);
    
    // Имя тега
    const tagLabel = document.createElement('label');
    tagLabel.style.cssText = labelStyle;
    tagLabel.textContent = 'Название тега';
    form.appendChild(tagLabel);
    
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.placeholder = 'Например: Работа';
    tagInput.style.cssText = inputStyle;
    if (isEdit) tagInput.value = existingTag.tagName;
    form.appendChild(tagInput);
    
    // Цвет
    const colorLabel = document.createElement('label');
    colorLabel.style.cssText = labelStyle;
    colorLabel.textContent = 'Цвет';
    form.appendChild(colorLabel);
    
    const colorWrapper = document.createElement('div');
    colorWrapper.style.cssText = `
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
    `;
    
    const selectedColor = isEdit ? existingTag.color : getRandomColor();
    
    for (const color of COLORS) {
        const colorBtn = document.createElement('button');
        colorBtn.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid ${color === selectedColor ? 'rgba(255,255,255,0.5)' : 'transparent'};
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
        `;
        colorBtn.onclick = () => {
            colorWrapper.querySelectorAll('button').forEach(b => {
                b.style.borderColor = 'transparent';
            });
            colorBtn.style.borderColor = 'rgba(255,255,255,0.5)';
            colorInput.value = color;
        };
        if (color === selectedColor) {
            colorBtn.style.borderColor = 'rgba(255,255,255,0.5)';
        }
        colorWrapper.appendChild(colorBtn);
    }
    
    const colorInput = document.createElement('input');
    colorInput.type = 'hidden';
    colorInput.value = selectedColor;
    form.appendChild(colorWrapper);
    form.appendChild(colorInput);
    
    // Кнопки
    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 4px;
    `;
    
    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `
        flex: 1;
        padding: 10px;
        background: #4ade80;
        border: none;
        border-radius: 8px;
        color: #0a0a0f;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    saveBtn.textContent = isEdit ? '💾 Сохранить' : '➕ Добавить';
    saveBtn.onmouseenter = () => { saveBtn.style.background = '#34d399'; };
    saveBtn.onmouseleave = () => { saveBtn.style.background = '#4ade80'; };
    saveBtn.onclick = () => {
        const chatName = chatInput.value.trim();
        const tagName = tagInput.value.trim();
        const color = colorInput.value;
        
        if (!chatName || !tagName) {
            alert('Заполните все поля!');
            return;
        }
        
        if (isEdit) {
            updateTag(existingTag.id, { chatName, tagName, color });
        } else {
            addTag({
                id: generateTagId(),
                chatName,
                tagName,
                color,
                createdAt: Date.now(),
            });
        }
        
        form.remove();
        onSave();
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
        padding: 10px 20px;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        color: rgba(255,255,255,0.3);
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onmouseenter = () => { cancelBtn.style.color = 'rgba(255,255,255,0.6)'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.color = 'rgba(255,255,255,0.3)'; };
    cancelBtn.onclick = () => {
        form.remove();
    };
    
    btnWrapper.appendChild(saveBtn);
    btnWrapper.appendChild(cancelBtn);
    form.appendChild(btnWrapper);
    
    return form;
}