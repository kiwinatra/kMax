// src/features/showMetadata/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { watchDOM } from '../../core/observer';
import { qsa, createElement } from '../../core/dom';
import { OFFSETS } from '../../offsets';

let isEnabled = false;
let unwatch: (() => void) | null = null;
let checkInterval: number | null = null;

async function getImageMetadata(img: HTMLImageElement): Promise<any> {
    const metadata: any = {};

    metadata.width = img.naturalWidth || img.width;
    metadata.height = img.naturalHeight || img.height;
    metadata.aspectRatio = (metadata.width / metadata.height).toFixed(2);

    const src = img.src;
    if (src) {
        const ext = src.split('.').pop()?.toUpperCase() || 'Unknown';
        metadata.format = ext;
        metadata.url = src;
    }

    try {
        const response = await fetch(img.src, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            const size = parseInt(contentLength);
            metadata.fileSize = size;
            metadata.fileSizeFormatted = formatFileSize(size);
        }
    } catch {}

    metadata.loadedAt = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return metadata;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

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

    const win = window.open('about:blank', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
    } else {
        logger.error('Не удалось открыть вкладку. Разрешите всплывающие окна для этого сайта.');
    }
}

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

function findPhotoContainers(): HTMLElement[] {
    // Ищем все div с классом actions svelte-2k9gk6
    const actionsElements = document.querySelectorAll('div.actions.svelte-2k9gk6');
    const containers: HTMLElement[] = [];

    for (const actions of actionsElements) {
        // Проверяем, что внутри есть изображение
        const img = actions.querySelector('img');
        if (img) {
            containers.push(actions as HTMLElement);
        }
    }

    if (containers.length > 0) {
        logger.debug(`Found ${containers.length} photo containers with actions`);
        return containers;
    }

    // Fallback: ищем любые контейнеры с изображениями
    const allImages = document.querySelectorAll('img');
    const uniqueContainers = new Set<HTMLElement>();

    for (const img of allImages) {
        let parent = img.parentElement;
        while (parent && !parent.classList.contains('actions')) {
            parent = parent.parentElement;
        }
        if (parent) {
            uniqueContainers.add(parent as HTMLElement);
        }
    }

    const result = Array.from(uniqueContainers);
    if (result.length > 0) {
        logger.debug(`Found ${result.length} containers by fallback search`);
    }

    return result;
}

function addMetadataButton(container: HTMLElement): void {
    // Проверяем, есть ли уже кнопка
    if (container.querySelector('.kmod-metadata-btn')) {
        return;
    }

    // Ищем изображение внутри контейнера
    const img = container.querySelector('img');
    if (!img) {
        return;
    }

    // Проверяем, что изображение загружено
    if (!img.src || img.src === '') {
        return;
    }

    logger.debug(`Adding metadata button for image: ${img.src.substring(0, 50)}...`);

    // Создаем кнопку с правильными классами
    const button = createElement('button', {
        className: 'button button--small button--ghost svelte-15dnyr kmod-metadata-btn',
        events: {
            click: async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget as HTMLElement;
                const span = btn.querySelector('.content');
                if (span) span.textContent = '⏳';

                try {
                    const metadata = await getImageMetadata(img);
                    openMetadataTab(metadata);
                } catch (error) {
                    logger.error('Ошибка получения метаданных:', error);
                    if (span) span.textContent = '❌';
                    setTimeout(() => {
                        if (span) span.textContent = 'Metadata';
                    }, 2000);
                } finally {
                    if (span && span.textContent !== '❌') {
                        span.textContent = 'Metadata';
                    }
                }
            }
        }
    });

    const span = createElement('span', {
        className: 'content svelte-15dnyr',
    });
    span.textContent = 'Metadata';
    button.appendChild(span);

    container.appendChild(button);
    logger.debug('Metadata button added');
}

function processPage(): void {
    // Проверяем состояние из storage
    const enabled = storage.getBoolean('showMetadata');
    if (!enabled) return;

    const containers = findPhotoContainers();

    if (containers.length === 0) {
        return;
    }

    let added = 0;
    for (const container of containers) {
        if (!container.querySelector('.kmod-metadata-btn')) {
            addMetadataButton(container);
            added++;
        }
    }

    if (added > 0) {
        logger.debug(`Added ${added} metadata buttons`);
    }
}

export function apply(): void {
    // Проверяем состояние из storage
    const enabled = storage.getBoolean('showMetadata');
    if (enabled) {
        processPage();
    } else {
        removeButtons();
    }
}

function removeButtons(): void {
    const buttons = document.querySelectorAll('.kmod-metadata-btn');
    for (const btn of buttons) {
        btn.remove();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;

    logger.info('📷 Metadata кнопка включена');

    // Обрабатываем существующие элементы
    processPage();

    // Подписываемся на изменения DOM
    if (!unwatch) {
        unwatch = watchDOM(() => {
            processPage();
        });
    }

    // Агрессивная проверка каждую секунду
    if (!checkInterval) {
        checkInterval = window.setInterval(() => {
            processPage();
        }, 1000);
        logger.debug('Started aggressive checking interval (1s)');
    }
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;

    // Отписываемся от DOM-изменений
    if (unwatch) {
        unwatch();
        unwatch = null;
    }

    // Останавливаем интервал
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        logger.debug('Stopped aggressive checking interval');
    }

    removeButtons();
    logger.info('📷 Metadata кнопка отключена');
}

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