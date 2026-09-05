// src/ui/versionBadge.ts

import { createElement } from '../core/dom';
import { CONFIG } from '../config';
import { openSettingsModal } from './settingsModal';
import { logger } from '../core/logger';

const BADGE_CLASS = 'kmod-version-badge';
const ANIMATION_DURATION = 300;

/**
 * Создаёт бейдж с версией мода в правом нижнем углу.
 * При клике открывает настройки.
 * Имеет анимацию появления и пульсацию.
 */
export function createVersionBadge(version: string = CONFIG.version): void {
  // Удаляем старый, если есть
  removeVersionBadge();

  const badge = createElement('div', {
    className: BADGE_CLASS,
    styles: {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      background: 'rgba(0, 0, 0, 0.75)',
      color: '#888',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: '99999',
      userSelect: 'none',
      cursor: 'pointer',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.05)',
      transition: `all ${ANIMATION_DURATION}ms ease`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      letterSpacing: '0.3px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    events: {
      click: () => {
        logger.debug('Version badge clicked, opening settings');
        openSettingsModal();
      },
      mouseenter: (e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.background = 'rgba(30, 30, 40, 0.9)';
        target.style.color = '#fff';
        target.style.borderColor = 'rgba(255,215,0,0.3)';
        target.style.transform = 'scale(1.05)';
      },
      mouseleave: (e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.background = 'rgba(0, 0, 0, 0.75)';
        target.style.color = '#888';
        target.style.borderColor = 'rgba(255,255,255,0.05)';
        target.style.transform = 'scale(1)';
      },
    },
  });

  // Точка-индикатор (цветная)
  const dot = document.createElement('span');
  dot.style.cssText = `
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3ba55c;
    animation: kmod-badge-pulse 2s ease-in-out infinite;
  `;
  badge.appendChild(dot);

  // Текст
  const text = document.createTextNode(`v${version}`);
  badge.appendChild(text);

  // Добавляем стили для анимации (если ещё нет)
  if (!document.querySelector('#kmod-badge-styles')) {
    const style = document.createElement('style');
    style.id = 'kmod-badge-styles';
    style.textContent = `
      @keyframes kmod-badge-pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0.6; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(badge);
}

/**
 * Удаление бейджа версии
 */
export function removeVersionBadge(): void {
  const badge = document.querySelector(`.${BADGE_CLASS}`);
  if (badge) badge.remove();
}

/**
 * Обновление текста бейджа (например, при смене версии)
 */
export function updateVersionBadge(version: string): void {
  const badge = document.querySelector(`.${BADGE_CLASS}`);
  if (badge) {
    // Обновляем текст, сохраняя точку
    const textNode = badge.childNodes[1]; // предполагаем, что второй child - текст
    if (textNode) textNode.textContent = `v${version}`;
  } else {
    createVersionBadge(version);
  }
}