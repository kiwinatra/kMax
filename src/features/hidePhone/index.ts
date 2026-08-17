// src/features/hidePhone/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';

let isEnabled = false;

function hidePhoneElements(): void {
    const items = qsa(OFFSETS.classes.phoneElement);
    for (const el of items) {
        (el as HTMLElement).style.display = 'none';
    }
    if (items.length > 0) {
        logger.debug(`Hidden ${items.length} phone element(s)`);
    }
}

function showPhoneElements(): void {
    const items = qsa(OFFSETS.classes.phoneElement);
    for (const el of items) {
        (el as HTMLElement).style.display = '';
    }
    if (items.length > 0) {
        logger.debug(`Shown ${items.length} phone element(s)`);
    }
}

/**
 * Применяет текущее состояние (скрыть/показать) ко всем элементам
 * Вызывается при загрузке и при каждом изменении DOM
 */
export function apply(): void {
    if (isEnabled) {
        hidePhoneElements();
    } else {
        showPhoneElements();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    apply();
    logger.info('📱 Телефон скрыт');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    apply();
    logger.info('📱 Телефон показан');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hidePhone');
    const newState = !current;
    storage.setBoolean('hidePhone', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}