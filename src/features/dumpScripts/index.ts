/*
* @author: potemk.in
* @brief: Dump all <script> tags on the page into a beautified ZIP.
* @desc: Pure function — no side effects on import. Loads beautify + JSZip
*       from CDN lazily on first call, caches the promise so concurrent calls
*       share the same load. Global window.__kmax_dump_scripts is set once in
*       main.ts → setupGlobalAPI (not here).
*/

import { logger } from '../../core/logger';

// ============================================================
// TYPES
// ============================================================

interface ScriptInfo {
    src: string | null;
    content: string;
    type: string;
    isInline: boolean;
    index: number;
}

// ============================================================
// LIBRARY LOADING (cached promises)
// ============================================================

const BEAUTIFY_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify-css.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.11/beautify-html.min.js',
];
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

let beautifyPromise: Promise<void> | null = null;
let jszipPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(el);
    });
}

function ensureBeautify(): Promise<void> {
    if (!beautifyPromise) {
        beautifyPromise = (async () => {
            for (const url of BEAUTIFY_URLS) {
                await loadScript(url);
            }
        })().catch((error) => {
            logger.error('Failed to load beautify:', error);
            beautifyPromise = null;
            throw error;
        });
    }
    return beautifyPromise;
}

function ensureJSZip(): Promise<void> {
    if (!jszipPromise) {
        jszipPromise = loadScript(JSZIP_URL).catch((error) => {
            logger.error('Failed to load JSZip:', error);
            jszipPromise = null;
            throw error;
        });
    }
    return jszipPromise;
}

// ============================================================
// SCRIPT COLLECTION
// ============================================================

function collectScripts(): ScriptInfo[] {
    const scripts: ScriptInfo[] = [];
    const elements = document.querySelectorAll('script');

    elements.forEach((el, index) => {
        const src = el.src || null;
        const isInline = !src;
        scripts.push({
            src,
            content: isInline ? el.textContent || '' : '',
            type: el.type || 'text/javascript',
            isInline,
            index,
        });
    });

    return scripts;
}

async function fetchExternalScript(src: string): Promise<string> {
    try {
        const response = await fetch(src, { cache: 'force-cache' });
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

interface BeautifyWindow extends Window {
    js_beautify?: (code: string, options?: Record<string, unknown>) => string;
    beautify?: (code: string) => string;
}

function beautifyCode(content: string): string {
    const w = window as BeautifyWindow;
    try {
        if (typeof w.js_beautify === 'function') {
            return w.js_beautify(content, {
                indent_size: 2,
                indent_char: ' ',
                preserve_newlines: true,
                max_preserve_newlines: 2,
                wrap_line_length: 120,
            });
        }
        if (typeof w.beautify === 'function') {
            return w.beautify(content);
        }
        return content;
    } catch (error) {
        logger.warn('Beautify failed', error);
        return content;
    }
}

// ============================================================
// MAIN
// ============================================================

export async function dumpScripts(): Promise<void> {
    logger.info('🔍 Starting script dump...');

    try {
        await ensureBeautify();
        await ensureJSZip();

        const JSZip = (window as any).JSZip;
        if (!JSZip) throw new Error('JSZip library not loaded');

        const scriptInfos = collectScripts();
        logger.info(`📦 Found ${scriptInfos.length} script tags`);

        const zip = new JSZip();

        // Inline scripts
        const inlineScripts = scriptInfos.filter((s) => s.isInline);
        for (const s of inlineScripts) {
            if (s.content.trim()) {
                const name = `inline_${String(s.index).padStart(3, '0')}.js`;
                zip.file(name, beautifyCode(s.content));
            }
        }

        // External scripts
        const externalScripts = scriptInfos.filter((s) => !s.isInline && s.src);
        logger.info(`📡 Fetching ${externalScripts.length} external scripts...`);

        for (const s of externalScripts) {
            if (!s.src) continue;
            const content = await fetchExternalScript(s.src);
            const url = new URL(s.src, window.location.href);
            const parts = url.pathname.split('/');
            const filename = parts[parts.length - 1] || 'script.js';
            zip.file(`external_${filename}`, beautifyCode(content));
        }

        // Info file
        const info = [
            '// Page Info',
            '// =========',
            `// URL: ${window.location.href}`,
            `// Title: ${document.title}`,
            `// Timestamp: ${new Date().toISOString()}`,
            `// Total Scripts: ${scriptInfos.length}`,
            `// Inline: ${inlineScripts.length}`,
            `// External: ${externalScripts.length}`,
            '',
            '// SCRIPT LIST:',
            ...scriptInfos.map((s, i) => {
                const type = s.isInline ? 'inline' : 'external';
                return `// [${i}] ${type}: ${s.src || 'N/A'}`;
            }),
        ].join('\n');
        zip.file('info.txt', info);

        // Generate + download
        logger.info('📦 Generating ZIP archive...');
        const zipData = await zip.generateAsync({ type: 'arraybuffer' });

        const blob = new Blob([zipData], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `scripts_${ts}.zip`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);

        logger.info(
            `✅ Archive downloaded: ${Object.keys(zip.files).length} files, ${(zipData.byteLength / 1024).toFixed(2)} KB`
        );
    } catch (error) {
        logger.error('Script dump failed:', error);
    }
}

export default dumpScripts;