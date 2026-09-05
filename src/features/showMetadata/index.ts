// src/features/showMetadata/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';

// ============================================================
// КОНСТАНТЫ
// ============================================================

const DEBOUNCE_DELAY = 300; // ms
const METADATA_BUTTON_CLASS = 'kmod-metadata-btn';
const MAX_CACHE_SIZE = 50; // кеш метаданных

// ============================================================
// СОСТОЯНИЕ
// ============================================================

let isEnabled = false;
let unwatch: (() => void) | null = null;
let debounceTimer: number | null = null;
let processedContainers = new WeakSet<HTMLElement>();
const metadataCache = new Map<string, any>();

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Форматирование размера файла
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Получение метаданных изображения (с кешированием)
 */
async function getImageMetadata(img: HTMLImageElement): Promise<any> {
    const cacheKey = img.src;
    
    // Проверяем кеш
    if (metadataCache.has(cacheKey)) {
        return metadataCache.get(cacheKey);
    }

    const metadata: any = {};

    // Размеры
    metadata.width = img.naturalWidth || img.width || 0;
    metadata.height = img.naturalHeight || img.height || 0;
    metadata.aspectRatio = metadata.width && metadata.height 
        ? (metadata.width / metadata.height).toFixed(2) 
        : 'N/A';

    // Формат
    const src = img.src;
    if (src) {
        const ext = src.split('.').pop()?.toUpperCase() || 'Unknown';
        metadata.format = ext;
        metadata.url = src;
    }

    // Размер файла (HEAD-запрос)
    try {
        const response = await fetch(img.src, { 
            method: 'HEAD',
            cache: 'force-cache',
        });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            const size = parseInt(contentLength);
            if (!isNaN(size) && size > 0) {
                metadata.fileSize = size;
                metadata.fileSizeFormatted = formatFileSize(size);
            }
        }
    } catch (error) {
        // Тихо, если не удалось получить размер
    }

    // Дата загрузки
    metadata.loadedAt = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    // Сохраняем в кеш
    if (metadataCache.size >= MAX_CACHE_SIZE) {
        // Удаляем старый элемент
        const firstKey = metadataCache.keys().next().value;
        if (firstKey) metadataCache.delete(firstKey);
    }
    metadataCache.set(cacheKey, metadata);

    return metadata;
}

/**
 * Построение HTML для модального окна
 */
function buildMetadataHTML(metadata: any): string {
    const fields = [
        { key: 'width', label: '📐 Ширина' },
        { key: 'height', label: '📏 Высота' },
        { key: 'aspectRatio', label: '🔄 Соотношение' },
        { key: 'format', label: '📁 Формат' },
        { key: 'fileSizeFormatted', label: '💾 Размер' },
        { key: 'loadedAt', label: '🕐 Загружено' },
    ];

    let html = '';
    let hasData = false;

    for (const field of fields) {
        const value = metadata[field.key];
        if (value === undefined || value === null || value === '') continue;
        if (value === 'N/A') continue;
        if (typeof value === 'number' && value === 0) continue;
        
        hasData = true;
        html += `
            <div class="field">
                <span class="label">${field.label}</span>
                <span class="value">${String(value)}</span>
            </div>
        `;
    }

    if (metadata.url) {
        hasData = true;
        html += `
            <div class="field">
                <span class="label">🔗 Ссылка</span>
                <span class="value" data-copy="${metadata.url}" style="cursor:pointer;color:#60a5fa;">
                    Копировать
                </span>
            </div>
        `;
    }

    if (!hasData) {
        html = `<div class="empty">Нет доступных данных</div>`;
    }

    return html;
}

/**
 * Открытие модального окна с метаданными
 */
function openMetadataTab(metadata: any): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>📷 Metadata</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d0d1a;
            color: #e0e0e0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: #1a1a2e;
            border-radius: 16px;
            padding: 32px 40px;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 24px 80px rgba(0,0,0,0.8);
            border: 1px solid rgba(255,255,255,0.06);
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .header h1 {
            font-size: 20px;
            font-weight: 600;
            color: #e0e0e0;
        }
        .header .close {
            color: #555;
            font-size: 24px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            background: none;
            border: none;
        }
        .header .close:hover {
            color: #e0e0e0;
            background: rgba(255,255,255,0.05);
        }
        .field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .field:last-child {
            border-bottom: none;
        }
        .field .label {
            color: #888;
            font-size: 14px;
        }
        .field .value {
            color: #e0e0e0;
            font-size: 14px;
            font-weight: 500;
            word-break: break-all;
            max-width: 200px;
            text-align: right;
        }
        .empty {
            color: #555;
            text-align: center;
            padding: 40px 0;
            font-size: 14px;
        }
        .footer {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.04);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        .footer button {
            background: rgba(255,255,255,0.06);
            border: none;
            color: #888;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .footer button:hover {
            background: rgba(255,255,255,0.12);
            color: #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📷 Информация о фото</h1>
            <button class="close" onclick="window.close()">✕</button>
        </div>
        <div id="content">
            ${buildMetadataHTML(metadata)}
        </div>
        <div class="footer">
            <button onclick="window.close()">Закрыть</button>
        </div>
    </div>
    <script>
        document.addEventListener('click', function(e) {
            const el = e.target;
            if (el.dataset.copy) {
                navigator.clipboard.writeText(el.dataset.copy).then(() => {
                    const original = el.textContent;
                    el.textContent = '✅ Скопировано!';
                    setTimeout(() => { el.textContent = original; }, 1500);
                });
            }
        });
    </script>
</body>
</html>
    `;

    try {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
        } else {
            logger.error('Не удалось открыть вкладку. Разрешите всплывающие окна.');
            alert('⚠️ Разрешите всплывающие окна для этого сайта, чтобы увидеть метаданные.');
        }
    } catch (error) {
        logger.error('Ошибка при открытии вкладки:', error);
    }
}

/**
 * Поиск контейнеров с фото (оптимизированный)
 */
function findPhotoContainers(): HTMLElement[] {
    // Ищем все div.actions.svelte-2k9gk6
    const actionsElements = document.querySelectorAll('div.actions.svelte-2k9gk6');
    const containers: HTMLElement[] = [];

    for (const actions of actionsElements) {
        const img = actions.querySelector('img');
        if (img && img.src) {
            containers.push(actions as HTMLElement);
        }
    }

    // Если нашли — возвращаем
    if (containers.length > 0) {
        return containers;
    }

    // Fallback: ищем любые контейнеры с изображениями
    const allImages = document.querySelectorAll('img');
    const uniqueContainers = new Set<HTMLElement>();

    for (const img of allImages) {
        if (!img.src) continue;
        
        let parent = img.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            if (parent.classList.contains('actions')) {
                uniqueContainers.add(parent as HTMLElement);
                break;
            }
            parent = parent.parentElement;
            depth++;
        }
    }

    return Array.from(uniqueContainers);
}

/**
 * Добавление кнопки метаданных к контейнеру
 */
function addMetadataButton(container: HTMLElement): void {
    // Проверяем, есть ли уже кнопка
    if (container.querySelector(`.${METADATA_BUTTON_CLASS}`)) return;
    
    // Проверяем, не обрабатывали ли уже этот контейнер
    if (processedContainers.has(container)) return;

    const img = container.querySelector('img');
    if (!img || !img.src) return;

    // Проверяем, что изображение загружено
    if (!img.complete || img.naturalWidth === 0) {
        // Если не загружено — ждём
        img.addEventListener('load', () => {
            if (isEnabled) {
                addMetadataButton(container);
            }
        }, { once: true });
        return;
    }

    // Помечаем как обработанный
    processedContainers.add(container);

    // Создаём кнопку
    const button = createElement('button', {
        className: `button button--small button--ghost svelte-15dnyr ${METADATA_BUTTON_CLASS}`,
        events: {
            click: async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget as HTMLElement;
                const span = btn.querySelector('.content') as HTMLElement;
                if (span) {
                    span.textContent = '⏳ Загрузка...';
                    span.style.opacity = '0.5';
                }

                try {
                    const metadata = await getImageMetadata(img);
                    openMetadataTab(metadata);
                } catch (error) {
                    logger.error('Ошибка получения метаданных:', error);
                    if (span) {
                        span.textContent = '❌ Ошибка';
                        span.style.color = '#ed4245';
                        setTimeout(() => {
                            span.textContent = 'Metadata';
                            span.style.color = '';
                            span.style.opacity = '';
                        }, 2000);
                    }
                } finally {
                    if (span && span.textContent !== '❌ Ошибка') {
                        span.textContent = 'Metadata';
                        span.style.opacity = '';
                    }
                }
            },
        },
        attrs: {
            title: 'Показать метаданные фото',
        },
    });

    const span = createElement('span', {
        className: 'content svelte-15dnyr',
        text: 'Metadata',
    });
    button.appendChild(span);

    // Добавляем в конец контейнера
    container.appendChild(button);
}

/**
 * Обработка страницы (основная логика)
 */
function processPage(): void {
    const enabled = storage.getBoolean('showMetadata');
    if (!enabled) return;

    const containers = findPhotoContainers();
    if (containers.length === 0) return;

    let added = 0;
    for (const container of containers) {
        if (!container.querySelector(`.${METADATA_BUTTON_CLASS}`)) {
            addMetadataButton(container);
            added++;
        }
    }

    if (added > 0) {
        logger.debug(`📷 Added ${added} metadata buttons`);
    }
}

/**
 * Удаление всех кнопок
 */
function removeAllButtons(): void {
    const buttons = document.querySelectorAll(`.${METADATA_BUTTON_CLASS}`);
    for (const btn of buttons) {
        btn.remove();
    }
    processedContainers = new WeakSet(); // Очищаем кеш
    metadataCache.clear(); // Очищаем кеш метаданных
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

// ============================================================
// ПУБЛИЧНЫЙ API
// ============================================================

/**
 * Применение текущего состояния
 */
export function apply(): void {
    const enabled = storage.getBoolean('showMetadata');
    if (enabled) {
        processPage();
    } else {
        removeAllButtons();
    }
}

/**
 * Включение функции
 */
export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    logger.info('📷 Metadata button enabled');
    processPage();

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

    if (unwatch) {
        unwatch();
        unwatch = null;
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    removeAllButtons();
    logger.info('📷 Metadata button disabled');
}

/**
 * Переключение состояния
 */
export function toggle(): boolean {
    const current = storage.getBoolean('showMetadata');
    const newState = !current;
    storage.setBoolean('showMetadata', newState);

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
});