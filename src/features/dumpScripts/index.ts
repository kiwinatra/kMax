// src/features/dumpScripts/index.ts

import { logger } from '../../core/logger';

interface ScriptInfo {
    src: string | null;
    content: string;
    type: string;
    isInline: boolean;
    index: number;
}

let beautifyLoaded = false;
let jszipLoaded = false;

// ============================================================
// ЗАГРУЗКА БИБЛИОТЕК С CDN
// ============================================================

function loadLibrary(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load: ${url}`));
        document.head.appendChild(script);
    });
}

async function ensureBeautify(): Promise<void> {
    if (beautifyLoaded) return;
    try {
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify.min.js');
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify-css.min.js');
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify-html.min.js');
        beautifyLoaded = true;
    } catch (error) {
        logger.error('Failed to load beautify library', error);
    }
}

async function ensureJSZip(): Promise<void> {
    if (jszipLoaded) return;
    try {
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        jszipLoaded = true;
    } catch (error) {
        logger.error('Failed to load JSZip library', error);
    }
}

// ============================================================
// COLLECT SCRIPTS
// ============================================================

function collectScripts(): ScriptInfo[] {
    const scripts: ScriptInfo[] = [];
    const elements = document.querySelectorAll('script');

    elements.forEach((el, index) => {
        const src = el.src || null;
        const isInline = !src || src === '';
        const content = isInline ? el.textContent || '' : '';
        const type = el.type || 'text/javascript';

        scripts.push({
            src,
            content,
            type,
            isInline,
            index,
        });
    });

    return scripts;
}

// ============================================================
// DOWNLOAD EXTERNAL SCRIPTS
// ============================================================

async function fetchExternalScript(src: string): Promise<string> {
    try {
        const response = await fetch(src, {
            cache: 'force-cache',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (error) {
        logger.warn(`Failed to fetch script: ${src}`, error);
        return `// Failed to fetch: ${src}\n// Error: ${error}`;
    }
}

// ============================================================
// BEAUTIFY
// ============================================================

function beautifyCode(content: string): string {
    try {
        if (typeof (window as any).js_beautify === 'function') {
            return (window as any).js_beautify(content, {
                indent_size: 2,
                indent_char: ' ',
                preserve_newlines: true,
                max_preserve_newlines: 2,
                wrap_line_length: 120,
            });
        }
        if (typeof (window as any).beautify !== 'undefined') {
            return (window as any).beautify(content);
        }
        return content;
    } catch (error) {
        logger.warn('Beautify failed', error);
        return content;
    }
}

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================

export async function dumpScripts(): Promise<void> {
    logger.info('🔍 Starting script dump...');

    try {
        // Загружаем библиотеки
        await ensureBeautify();
        await ensureJSZip();

        // Проверяем, что JSZip загрузился
        const JSZip = (window as any).JSZip;
        if (!JSZip) {
            throw new Error('JSZip library not loaded');
        }

        // 1. Собираем скрипты
        const scriptInfos = collectScripts();
        logger.info(`📦 Found ${scriptInfos.length} script tags`);

        // 2. Создаём ZIP архив
        const zip = new JSZip();

        // 3. Обрабатываем инлайн-скрипты
        const inlineScripts = scriptInfos.filter(s => s.isInline);
        for (const s of inlineScripts) {
            if (s.content.trim()) {
                const name = `inline_${String(s.index).padStart(3, '0')}.js`;
                const beautified = beautifyCode(s.content);
                zip.file(name, beautified);
            }
        }

        // 4. Обрабатываем внешние скрипты
        const externalScripts = scriptInfos.filter(s => !s.isInline && s.src);
        logger.info(`📡 Fetching ${externalScripts.length} external scripts...`);

        for (const s of externalScripts) {
            if (!s.src) continue;
            const content = await fetchExternalScript(s.src);
            const url = new URL(s.src, window.location.href);
            const pathParts = url.pathname.split('/');
            const filename = pathParts[pathParts.length - 1] || 'script.js';
            const name = `external_${filename}`;
            const beautified = beautifyCode(content);
            zip.file(name, beautified);
        }

        // 5. Добавляем файл с информацией о странице
        const infoContent = `
// Page Info
// =========
// URL: ${window.location.href}
// Title: ${document.title}
// Timestamp: ${new Date().toISOString()}
// Total Scripts: ${scriptInfos.length}
// Inline: ${inlineScripts.length}
// External: ${externalScripts.length}

// SCRIPT LIST:
${scriptInfos.map((s, i) => {
    const type = s.isInline ? 'inline' : 'external';
    const src = s.src || 'N/A';
    return `// [${i}] ${type}: ${src}`;
}).join('\n')}
`;
        zip.file('info.txt', infoContent);

        // 6. Генерируем ZIP
        logger.info('📦 Generating ZIP archive...');
        const zipData = await zip.generateAsync({ type: 'arraybuffer' });

        // 7. Скачиваем архив
        const blob = new Blob([zipData], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `scripts_${timestamp}.zip`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);

        logger.info(`✅ Archive downloaded: ${Object.keys(zip.files).length} files, ${(zipData.byteLength / 1024).toFixed(2)} KB`);
    } catch (error) {
        logger.error('Script dump failed:', error);
        console.error(error);
    }
}

// ============================================================
// ГЛОБАЛЬНАЯ ФУНКЦИЯ
// ============================================================

if (typeof window !== 'undefined') {
    (window as any).__kmax_dump_scripts = dumpScripts;
    logger.info('🌐 Global function added: __kmax_dump_scripts()');
}

export default dumpScripts;