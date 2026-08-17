// src/ui/versionBadge.ts
import { createElement } from '../core/dom';
import { CONFIG } from '../config';

export function createVersionBadge(version: string = CONFIG.version): void {
    const existing = document.querySelector('.kmod-version-badge');
    if (existing) {
        existing.remove();
    }

    const badge = createElement('div', {
        className: 'kmod-version-badge',
        styles: {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.75)',
            color: '#888',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            zIndex: '99999',
            userSelect: 'none',
            pointerEvents: 'none',
        },
    });

    badge.textContent = `● v${version}`;
    document.body.appendChild(badge);
}

export function removeVersionBadge(): void {
    const badge = document.querySelector('.kmod-version-badge');
    if (badge) {
        badge.remove();
    }
}