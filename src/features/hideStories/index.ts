// src/features/hideStories/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { qsa } from '../../core/dom';
import { OFFSETS } from '../../offsets';

let isEnabled = false;

function hideStoriesElements(): void {
    const items = qsa(OFFSETS.classes.stories);
    for (const el of items) {
        (el as HTMLElement).style.display = 'none';
    }
    if (items.length > 0) {
        logger.debug(`Hidden ${items.length} stories`);
    }
}

function showStoriesElements(): void {
    const items = qsa(OFFSETS.classes.stories);
    for (const el of items) {
        (el as HTMLElement).style.display = '';
    }
    if (items.length > 0) {
        logger.debug(`Shown ${items.length} stories`);
    }
}

export function apply(): void {
    if (isEnabled) {
        hideStoriesElements();
    } else {
        showStoriesElements();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    apply();
    logger.info('📚 Сторисы скрыты');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    apply();
    logger.info('📚 Сторисы показаны');
}

export function toggle(): boolean {
    const current = storage.getBoolean('hideStories');
    const newState = !current;
    storage.setBoolean('hideStories', newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}