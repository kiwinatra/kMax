/*
* @author: potemk.in
* @brief: Adds a "Metadata" button to photo containers, showing size, format, and load time.
* @desc: Pure apply-based feature. Registry triggers apply() when `div.actions` or `img` nodes appear. Idempotent via WeakSet of processed containers + per-container button check. Metadata results are cached by image URL. No local observer, no timers.
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa, createElement } from '../../core/dom';

// ============================================================
// CONSTANTS
// ============================================================

const METADATA_BUTTON_CLASS = 'kmod-metadata-btn';
const ACTIONS_SELECTOR = 'div.actions.svelte-2k9gk6';
const MAX_METADATA_CACHE = 100;

// ============================================================
// STATE
// ============================================================

let isEnabled = false;
let processedContainers = new WeakSet<HTMLElement>();
const metadataCache = new Map<string, ImageMetadata>();

interface ImageMetadata {
    width: number;
    height: number;
    aspectRatio: string;
    format: string;
    url: string;
    fileSize?: number;
    fileSizeFormatted?: string;
    loadedAt: string;
}

// ============================================================
// FORMATTERS
// ============================================================

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// ============================================================
// METADATA
// ============================================================

async function getImageMetadata(img: HTMLImageElement): Promise<ImageMetadata> {
    const cacheKey = img.src;
    const cached = metadataCache.get(cacheKey);
    if (cached) return cached;

    const metadata: ImageMetadata = {
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        aspectRatio: 'N/A',
        format: 'Unknown',
        url: img.src,
        loadedAt: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    };

    if (metadata.width && metadata.height) {
        metadata.aspectRatio = (metadata.width / metadata.height).toFixed(2);
    }

    if (img.src) {
        const cleanUrl = img.src.split('?')[0];
        const ext = cleanUrl.split('.').pop()?.toUpperCase();
        if (ext && ext.length <= 5) metadata.format = ext;
    }

    try {
        const response = await fetch(img.src, { method: 'HEAD', cache: 'force-cache' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            const size = parseInt(contentLength);
            if (!isNaN(size) && size > 0) {
                metadata.fileSize = size;
                metadata.fileSizeFormatted = formatFileSize(size);
            }
        }
    } catch {
        // Silent — file size is optional
    }

    if (metadataCache.size >= MAX_METADATA_CACHE) {
        const firstKey = metadataCache.keys().next().value;
        if (firstKey !== undefined) metadataCache.delete(firstKey);
    }
    metadataCache.set(cacheKey, metadata);

    return metadata;
}

// ============================================================
// MODAL HTML
// ============================================================

function buildMetadataHTML(metadata: ImageMetadata): string {
    const fields: Array<[string, unknown]> = [
        ['📐 Ширина', metadata.width],
        ['📏 Высота', metadata.height],
        ['🔄 Соотношение', metadata.aspectRatio],
        ['📁 Формат', metadata.format],
        ['💾 Размер', metadata.fileSizeFormatted],
        ['🕐 Загружено', metadata.loadedAt],
    ];

    let html = '';
    let hasData = false;

    for (const [label, value] of fields) {
        if (value === undefined || value === null || value === '' || value === 'N/A') continue;
        if (typeof value === 'number' && value === 0) continue;
        hasData = true;
        html += `<div class="field"><span class="label">${label}</span><span class="value">${String(value)}</span></div>`;
    }

    if (metadata.url) {
        hasData = true;
        html += `<div class="field"><span class="label">🔗 Ссылка</span><span class="value" data-copy="${metadata.url}" style="cursor:pointer;color:#60a5fa;">Копировать</span></div>`;
    }

    if (!hasData) {
        html = `<div class="empty">Нет доступных данных</div>`;
    }
    return html;
}

function openMetadataTab(metadata: ImageMetadata): void {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>📷 Metadata</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d1a;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.container{background:#1a1a2e;border-radius:16px;padding:32px 40px;max-width:480px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.06);animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06)}
.header h1{font-size:20px;font-weight:600}
.header .close{color:#555;font-size:24px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all .2s;background:none;border:none}
.header .close:hover{color:#e0e0e0;background:rgba(255,255,255,.05)}
.field{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.field:last-child{border-bottom:none}
.field .label{color:#888;font-size:14px}
.field .value{color:#e0e0e0;font-size:14px;font-weight:500;word-break:break-all;max-width:200px;text-align:right}
.empty{color:#555;text-align:center;padding:40px 0;font-size:14px}
.footer{margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.04);display:flex;justify-content:flex-end}
.footer button{background:rgba(255,255,255,.06);border:none;color:#888;padding:6px 16px;border-radius:6px;font-size:13px;cursor:pointer;transition:all .2s}
.footer button:hover{background:rgba(255,255,255,.12);color:#e0e0e0}
</style></head>
<body><div class="container">
<div class="header"><h1>📷 Информация о фото</h1><button class="close" onclick="window.close()">✕</button></div>
<div id="content">${buildMetadataHTML(metadata)}</div>
<div class="footer"><button onclick="window.close()">Закрыть</button></div>
</div>
<script>
document.addEventListener('click',function(e){
  const el=e.target;
  if(el.dataset.copy){
    navigator.clipboard.writeText(el.dataset.copy).then(()=>{
      const o=el.textContent;el.textContent='✅ Скопировано!';
      setTimeout(()=>{el.textContent=o;},1500);
    });
  }
});
</script></body></html>`;

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

// ============================================================
// DOM
// ============================================================

function findPhotoContainers(): HTMLElement[] {
    const actionsElements = qsa<HTMLElement>(ACTIONS_SELECTOR);
    const containers: HTMLElement[] = [];

    for (const actions of actionsElements) {
        const img = actions.querySelector('img');
        if (img && img.src) containers.push(actions);
    }
    if (containers.length > 0) return containers;

    // Fallback: images with .actions ancestor
    const allImages = document.querySelectorAll('img');
    const unique = new Set<HTMLElement>();
    for (const img of allImages) {
        if (!img.src) continue;
        let parent = img.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            if (parent.classList.contains('actions')) {
                unique.add(parent as HTMLElement);
                break;
            }
            parent = parent.parentElement;
            depth++;
        }
    }
    return Array.from(unique);
}

function addMetadataButton(container: HTMLElement): boolean {
    if (container.querySelector(`.${METADATA_BUTTON_CLASS}`)) return false;
    if (processedContainers.has(container)) return false;

    const img = container.querySelector('img') as HTMLImageElement | null;
    if (!img || !img.src) return false;

    if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener(
            'load',
            () => {
                if (isEnabled) addMetadataButton(container);
            },
            { once: true }
        );
        return false;
    }

    processedContainers.add(container);

    const button = createElement('button', {
        className: `button button--small button--ghost svelte-15dnyr ${METADATA_BUTTON_CLASS}`,
        attrs: { title: 'Показать метаданные фото' },
        events: {
            click: async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget as HTMLElement;
                const span = btn.querySelector('.content') as HTMLElement | null;
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
    });

    const span = createElement('span', {
        className: 'content svelte-15dnyr',
        text: 'Metadata',
    });
    button.appendChild(span);
    container.appendChild(button);
    return true;
}

function processPage(): void {
    if (!isEnabled) return;
    if (!storage.getBoolean('showMetadata')) return;

    const containers = findPhotoContainers();
    if (containers.length === 0) return;

    let added = 0;
    for (const container of containers) {
        if (addMetadataButton(container)) added++;
    }

    if (added > 0) {
        logger.debug(`📷 Added ${added} metadata buttons`);
    }
}

function removeAllButtons(): void {
    const buttons = document.querySelectorAll(`.${METADATA_BUTTON_CLASS}`);
    for (const btn of buttons) btn.remove();
    processedContainers = new WeakSet();
    metadataCache.clear();
}

// ============================================================
// PUBLIC API
// ============================================================

/** Idempotent — adds buttons to new containers. */
export function apply(): void {
    if (storage.getBoolean('showMetadata')) {
        processPage();
    } else {
        removeAllButtons();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('📷 Metadata button enabled');
    processPage();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    removeAllButtons();
    logger.info('📷 Metadata button disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('showMetadata');
    storage.setBoolean('showMetadata', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}