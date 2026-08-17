// src/features/hideSferum/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';

let isEnabled = false;

function removeSferumButtons(): void {
    const buttons = qsa(OFFSETS.classes.sferumButton);
    let removed = 0;

    for (const btn of buttons) {
        const spans = btn.querySelectorAll('span');
        let found = false;

        for (const span of spans) {
            const text = span.textContent?.trim() || '';
            if (text === OFFSETS.texts.sferum || text.includes(OFFSETS.texts.sferum)) {
                found = true;
                break;
            }
        }

        if (found) {
            btn.remove();
            removed++;
        }
    }

    if (removed === 0) {
        for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.includes(OFFSETS.texts.sferum)) {
                btn.remove();
                removed++;
            }
        }
    }

    if (removed > 0) {
        logger.debug(`Removed ${removed} Sferum button(s)`);
    }
}

/**
 * Применяет скрытие кнопки Сферума, если фича включена.
 * Вызывается при загрузке и при каждом изменении DOM.
 */
export function apply(): void {
    if (isEnabled) {
        removeSferumButtons();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    apply();
    logger.info('🧹 Кнопка Сферума скрыта');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    logger.info('🧹 Кнопка Сферума показана (обнови страницу для восстановления)');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hideSferum');
    const newState = !current;
    storage.setBoolean('hideSferum', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}