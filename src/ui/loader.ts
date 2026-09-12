/*
* @author: potemk.in
* @brief: Full-screen loader and crash screen.
* @desc: Loader shows during init, fades out on hideLoader(). Crash screen
*       appears on init failure or unhandled mod errors. Styles are injected
*       once, lazily, on first use — no top-level IIFE.
*/

import { createElement } from '../core/dom';
import { CONFIG } from '../config';

// ============================================================
// STYLES (injected once, lazily)
// ============================================================

const STYLE_ID = 'kmod-loader-styles';

const CSS = `
@keyframes kmodLoaderSpin {
    to { transform: rotate(360deg); }
}
@keyframes kmodLoaderPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.08); }
}
@keyframes kmodLoaderFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
}
@keyframes kmodCrashFade {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes kmodCrashBounce {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50%      { transform: scale(1.08) rotate(-2deg); }
}
`;

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// LOADER
// ============================================================

let loaderElement: HTMLDivElement | null = null;
let isHidden = false;

export function showLoader(): void {
    if (loaderElement) return;
    ensureStyles();

    loaderElement = createElement('div', {
        styles: {
            position: 'fixed',
            inset: '0',
            zIndex: '9999999',
            background: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily:
                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#f0f0f0',
            transition: 'opacity 0.6s ease',
        },
    });

    const icon = createElement('div', {
        styles: {
            fontSize: '96px',
            fontWeight: '900',
            marginBottom: '32px',
            animation: 'kmodLoaderPulse 1.8s ease-in-out infinite',
            textShadow: '0 0 60px rgba(74, 222, 128, 0.3)',
            userSelect: 'none',
        },
        text: '⚡',
    });

    const spinner = createElement('div', {
        styles: {
            width: '72px',
            height: '72px',
            border: '4px solid rgba(255,255,255,0.08)',
            borderTop: '4px solid #4ade80',
            borderRadius: '50%',
            animation: 'kmodLoaderSpin 0.7s cubic-bezier(0.65, 0, 0.35, 1) infinite',
            marginBottom: '40px',
            boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)',
        },
    });

    const title = createElement('div', {
        styles: {
            fontSize: '56px',
            fontWeight: '900',
            color: '#ffffff',
            marginBottom: '8px',
            letterSpacing: '-2px',
            textShadow: '0 4px 40px rgba(0,0,0,0.6)',
            userSelect: 'none',
        },
        text: CONFIG.name,
    });

    const version = createElement('div', {
        styles: {
            fontSize: '24px',
            fontWeight: '700',
            color: 'transparent',
            webkitTextStroke: '2px rgba(255,255,255,0.25)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            userSelect: 'none',
        },
        text: `v${CONFIG.version}`,
    });

    loaderElement.appendChild(icon);
    loaderElement.appendChild(spinner);
    loaderElement.appendChild(title);
    loaderElement.appendChild(version);
    document.body.appendChild(loaderElement);
}

export function hideLoader(): void {
    if (!loaderElement || isHidden) return;
    isHidden = true;

    loaderElement.style.animation = 'kmodLoaderFadeOut 0.5s ease forwards';
    const el = loaderElement;

    setTimeout(() => {
        el.remove();
        if (loaderElement === el) loaderElement = null;
        isHidden = false;
    }, 550);
}

// ============================================================
// CRASH SCREEN
// ============================================================

let crashElement: HTMLDivElement | null = null;

export interface CrashOptions {
    title?: string;
    message?: string;
    error?: Error | string;
    details?: string;
}

export function showCrashScreen(options: CrashOptions): void {
    if (loaderElement) hideLoader();
    if (crashElement) {
        crashElement.remove();
        crashElement = null;
    }

    ensureStyles();

    const {
        title = '⚠️ Ошибка',
        message = 'Не удалось загрузить мод',
        error,
        details,
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error || '');
    const errorStack = error instanceof Error ? error.stack || '' : '';

    crashElement = createElement('div', {
        styles: {
            position: 'fixed',
            inset: '0',
            zIndex: '9999999',
            background: '#0a0a0f',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily:
                '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            animation: 'kmodCrashFade 0.4s ease',
        },
    });

    const modal = createElement('div', {
        styles: {
            maxWidth: '700px',
            width: '90%',
            padding: '0 20px',
            textAlign: 'center',
        },
    });

    const icon = createElement('div', {
        styles: {
            fontSize: '120px',
            fontWeight: '900',
            marginBottom: '16px',
            userSelect: 'none',
            animation: 'kmodCrashBounce 1.2s ease-in-out infinite',
        },
        text: '💥',
    });

    const titleEl = createElement('div', {
        styles: {
            fontSize: '52px',
            fontWeight: '900',
            color: '#ffffff',
            marginBottom: '12px',
            letterSpacing: '-2px',
            textShadow: '0 4px 40px rgba(0,0,0,0.6)',
            userSelect: 'none',
        },
        text: title,
    });

    const msgEl = createElement('div', {
        styles: {
            fontSize: '20px',
            fontWeight: '700',
            color: 'transparent',
            webkitTextStroke: '1.5px rgba(255,255,255,0.3)',
            letterSpacing: '2px',
            marginBottom: '24px',
            textTransform: 'uppercase',
            userSelect: 'none',
        },
        text: message,
    });

    let detailsHtml = '';
    if (errorMessage) {
        detailsHtml += `<div style="font-size:15px;color:#ed4245;background:rgba(237,66,69,0.08);padding:14px 20px;border-radius:12px;margin-bottom:16px;word-break:break-word;font-family:monospace;border:1px solid rgba(237,66,69,0.15);">${escapeHtml(errorMessage)}</div>`;
    }
    if (errorStack) {
        detailsHtml += `<details style="margin-bottom:16px;">
            <summary style="font-size:13px;color:rgba(255,255,255,0.3);cursor:pointer;font-weight:600;letter-spacing:1px;text-transform:uppercase;">📋 Стек ошибки</summary>
            <pre style="font-size:12px;color:rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);padding:14px;border-radius:10px;overflow:auto;max-height:150px;margin-top:8px;white-space:pre-wrap;word-break:break-word;border:1px solid rgba(255,255,255,0.04);">${escapeHtml(errorStack)}</pre>
        </details>`;
    }
    if (details) {
        detailsHtml += `<div style="font-size:13px;color:rgba(255,255,255,0.2);margin-top:8px;letter-spacing:0.5px;">${escapeHtml(details)}</div>`;
    }

    const detailsEl = createElement('div', { html: detailsHtml });

    const btnWrapper = createElement('div', {
        styles: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '24px',
            flexWrap: 'wrap',
        },
    });

    const reloadBtn = createElement('button', {
        styles: {
            background: '#4ade80',
            border: 'none',
            color: '#0a0a0f',
            padding: '14px 40px',
            borderRadius: '60px',
            fontSize: '18px',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 30px rgba(74, 222, 128, 0.25)',
        },
        text: '↻ Перезагрузить',
        events: {
            click: () => window.location.reload(),
            mouseenter: (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = 'scale(1.04)';
                btn.style.boxShadow = '0 8px 50px rgba(74, 222, 128, 0.4)';
            },
            mouseleave: (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '0 4px 30px rgba(74, 222, 128, 0.25)';
            },
        },
    });

    const disableBtn = createElement('button', {
        styles: {
            background: 'transparent',
            border: '2px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.6)',
            padding: '14px 32px',
            borderRadius: '60px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            letterSpacing: '0.5px',
        },
        text: '⛔ Отключить мод',
        events: {
            click: () => {
                try {
                    localStorage.setItem('kmod_safe_mode', 'true');
                } catch {}
                window.location.reload();
            },
            mouseenter: (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.borderColor = 'rgba(255,255,255,0.3)';
                btn.style.color = '#ffffff';
                btn.style.transform = 'scale(1.02)';
            },
            mouseleave: (e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.borderColor = 'rgba(255,255,255,0.12)';
                btn.style.color = 'rgba(255,255,255,0.6)';
                btn.style.transform = 'scale(1)';
            },
        },
    });

    btnWrapper.appendChild(reloadBtn);
    btnWrapper.appendChild(disableBtn);

    modal.appendChild(icon);
    modal.appendChild(titleEl);
    modal.appendChild(msgEl);
    modal.appendChild(detailsEl);
    modal.appendChild(btnWrapper);

    crashElement.appendChild(modal);
    document.body.appendChild(crashElement);

    console.error('[KMOD] CRASH:', { title, message, error, details });
}

export function isCrashScreenActive(): boolean {
    return crashElement !== null;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
    showLoader,
    hideLoader,
    showCrashScreen,
    isCrashScreenActive,
};