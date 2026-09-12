/*
* @author: potemk.in
* @brief: Small version badge in the corner that opens the settings modal on click.
* @desc: Intentionally minimal — no pulsing dots, no glow, no scale animations.
*       Just a tiny dim label that becomes readable on hover. Clickable → settings.
*/

import { CONFIG } from '../config';
import { openSettingsModal } from './settingsModal';
import { logger } from '../core/logger';

const BADGE_CLASS = 'kmod-version-badge';
const STYLE_ID = 'kmod-version-badge-style';

// ============================================================
// STYLES
// ============================================================

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.${BADGE_CLASS} {
    position: fixed;
    right: 10px;
    bottom: 10px;
    z-index: 99999;

    padding: 2px 6px;
    border-radius: 4px;

    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.2px;

    color: rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.35);

    cursor: pointer;
    user-select: none;
    transition: color 0.15s ease, background 0.15s ease;
}

.${BADGE_CLASS}:hover {
    color: rgba(255, 255, 255, 0.75);
    background: rgba(0, 0, 0, 0.55);
}
`;
    document.head.appendChild(style);
}

// ============================================================
// PUBLIC API
// ============================================================

export function createVersionBadge(version: string = CONFIG.version): void {
    removeVersionBadge();
    ensureStyles();

    const badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.textContent = `v${version}`;
    badge.title = 'kMax Mod';

    badge.addEventListener('click', () => {
        logger.debug('Version badge clicked, opening settings');
        openSettingsModal();
    });

    document.body.appendChild(badge);
}

export function removeVersionBadge(): void {
    const badge = document.querySelector(`.${BADGE_CLASS}`);
    if (badge) badge.remove();
}