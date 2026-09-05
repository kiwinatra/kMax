// src/features/replaceMax/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { OFFSETS } from '../../offsets';

// ============================================================
// КОНСТАНТЫ
// ============================================================

const DEBOUNCE_DELAY = 500; // ms (чуть больше, т.к. работа с текстом тяжёлая)
const MIN_INTERVAL = 2000; // защита от частых вызовов
const MAX_TEXT_LENGTH = 10000; // ограничение на размер текста

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let isEnabled = false;
let unwatch: (() => void) | null = null;
let debounceTimer: number | null = null;
let lastRun = 0;
let originalTexts: Map<Text, string> = new Map(); // храним оригинальные тексты

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Проверка, нужно ли заменять текст
 */
function shouldReplace(text: string): boolean {
    return text.includes('Max') && !text.includes('kMax') && text.length <= MAX_TEXT_LENGTH;
}

/**
 * Замена Max → MAX (с сохранением оригинала)
 */
function replaceTextNode(textNode: Text): void {
    const original = textNode.textContent || '';
    
    // Если уже заменяли — пропускаем
    if (originalTexts.has(textNode)) return;
    
    // Проверяем, нужно ли заменять
    if (!shouldReplace(original)) return;
    
    // Сохраняем оригинал
    originalTexts.set(textNode, original);
    
    // Заменяем
    const updated = original.replace(/(?<!k)Max/g, 'MAX');
    textNode.textContent = updated;
}

/**
 * Восстановление оригинального текста
 */
function restoreTextNode(textNode: Text): void {
    if (!originalTexts.has(textNode)) return;
    
    const original = originalTexts.get(textNode)!;
    if (textNode.textContent !== original) {
        textNode.textContent = original;
    }
    originalTexts.delete(textNode);
}

/**
 * Основная обработка страницы
 */
function processPage(): void {
    // Защита от слишком частых вызовов
    const now = Date.now();
    if (now - lastRun < MIN_INTERVAL) {
        return;
    }
    lastRun = now;

    const enabled = storage.getBoolean('replaceMax');
    
    // Создаём TreeWalker для текстовых узлов
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tag = parent.tagName;
                // Пропускаем скрипты и стили
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                const text = node.textContent || '';
                if (enabled) {
                    // Если включено — ищем текст для замены
                    if (text.includes('Max') && !text.includes('kMax')) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                } else {
                    // Если выключено — ищем тексты, которые мы меняли
                    if (originalTexts.has(node as Text)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
                
                return NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodesToProcess: Text[] = [];
    let node: Text | null;
    
    while ((node = walker.nextNode() as Text | null)) {
        nodesToProcess.push(node);
    }

    let processed = 0;
    if (enabled) {
        // Замена
        for (const textNode of nodesToProcess) {
            replaceTextNode(textNode);
            processed++;
        }
        if (processed > 0) {
            logger.debug(`🔄 Replaced "Max" → "MAX" in ${processed} text nodes`);
        }
    } else {
        // Восстановление
        for (const textNode of nodesToProcess) {
            restoreTextNode(textNode);
            processed++;
        }
        if (processed > 0) {
            logger.debug(`🔄 Restored ${processed} text nodes`);
        }
    }
}

/**
 * Debounced версия processPage
 */
function debouncedProcess(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        processPage();
    }, DEBOUNCE_DELAY);
}

/**
 * Полная очистка всех замен (принудительно)
 */
function restoreAll(): void {
    if (originalTexts.size === 0) return;
    
    let count = 0;
    for (const [textNode, original] of originalTexts) {
        if (textNode.textContent !== original) {
            textNode.textContent = original;
            count++;
        }
    }
    originalTexts.clear();
    
    if (count > 0) {
        logger.debug(`🔄 Restored ${count} text nodes (full cleanup)`);
    }
}

// ============================================================
// ПУБЛИЧНЫЙ API
// ============================================================

/**
 * Применение текущего состояния
 */
export function apply(): void {
    processPage();
}

/**
 * Включение функции
 */
export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    logger.info('🔄 Replace "Max" → "MAX" enabled');
    processPage();

    // Подписка на изменения DOM
    if (!unwatch) {
        unwatch = watchDOM(() => {
            debouncedProcess();
        });
    }
}

/**
 * Отключение функции
 */
export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    // Отписываемся от DOM
    if (unwatch) {
        unwatch();
        unwatch = null;
    }

    // Очищаем таймер
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    // Восстанавливаем все тексты
    restoreAll();

    logger.info('🔄 Replace "Max" → "MAX" disabled');
}

/**
 * Переключение состояния
 */
export function toggle(): boolean {
    const current = storage.getBoolean('replaceMax');
    const newState = !current;
    storage.setBoolean('replaceMax', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}

// ============================================================
// ОЧИСТКА ПРИ ВЫГРУЗКЕ
// ============================================================

window.addEventListener('beforeunload', () => {
    if (unwatch) {
        unwatch();
        unwatch = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    // Восстанавливаем всё при закрытии
    restoreAll();
});