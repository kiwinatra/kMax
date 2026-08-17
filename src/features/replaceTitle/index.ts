// src/features/replaceTitle/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';

function getOriginalTitle(): string {
    let current = document.title;
    if (current.startsWith('kMax | ')) {
        current = current.replace('kMax | ', '');
    }
    return current;
}

export function apply(): void {
    // Проверяем состояние из storage, а не из переменной isEnabled
    const enabled = storage.getBoolean('replaceTitle');
    if (!enabled) {
        // Если фича выключена, но заголовок всё ещё с префиксом — убираем
        if (document.title.startsWith('kMax | ')) {
            const original = getOriginalTitle();
            document.title = original;
            logger.debug('Title restored (was enabled in storage but now disabled)');
        }
        return;
    }

    // Фича включена — применяем
    const original = getOriginalTitle();
    if (!document.title.startsWith('kMax | ')) {
        document.title = `kMax | ${original}`;
        logger.debug(`Title applied: ${document.title}`);
    }
}

export function enable(): void {
    storage.setBoolean('replaceTitle', true);
    apply();
    logger.info('📝 Замена заголовка включена');
}

export function disable(): void {
    storage.setBoolean('replaceTitle', false);
    const original = getOriginalTitle();
    document.title = original;
    logger.info('📝 Замена заголовка отключена');
}

export function toggle(): boolean {
    const current = storage.getBoolean('replaceTitle');
    const newState = !current;
    storage.setBoolean('replaceTitle', newState);
    if (newState) {
        apply();
        logger.info('📝 Замена заголовка включена (toggle)');
    } else {
        const original = getOriginalTitle();
        document.title = original;
        logger.info('📝 Замена заголовка отключена (toggle)');
    }
    return newState;
}