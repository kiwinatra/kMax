// src/features/replaceTitle/index.ts

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';

// ============================================================
// КОНСТАНТЫ
// ============================================================

const PREFIX = 'kMax | ';
const TITLE_STORAGE_KEY = 'replaceTitle';

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Получение оригинального заголовка (без префикса)
 */
function getOriginalTitle(): string {
    let current = document.title;
    if (current.startsWith(PREFIX)) {
        current = current.slice(PREFIX.length);
    }
    return current;
}

/**
 * Сохранение оригинального заголовка в dataset (для надёжности)
 */
function storeOriginalTitle(title: string): void {
    document.documentElement.dataset.kmodOriginalTitle = title;
}

/**
 * Получение сохранённого оригинального заголовка
 */
function getStoredOriginalTitle(): string | null {
    return document.documentElement.dataset.kmodOriginalTitle || null;
}

/**
 * Проверка, есть ли уже префикс
 */
function hasPrefix(): boolean {
    return document.title.startsWith(PREFIX);
}

/**
 * Безопасное обновление заголовка (с защитой от рекурсии)
 */
function safeSetTitle(newTitle: string): void {
    if (document.title !== newTitle) {
        document.title = newTitle;
    }
}

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

/**
 * Применение заголовка с префиксом
 */
function applyTitle(): void {
    // Если уже есть префикс — пропускаем
    if (hasPrefix()) {
        return;
    }

    // Получаем оригинальный заголовок
    let original = getStoredOriginalTitle();
    if (!original) {
        original = getOriginalTitle();
        storeOriginalTitle(original);
    }

    // Если оригинал уже содержит префикс (защита от дублирования)
    if (original.startsWith(PREFIX)) {
        original = original.slice(PREFIX.length);
        storeOriginalTitle(original);
    }

    const newTitle = `${PREFIX}${original}`;
    safeSetTitle(newTitle);
    logger.debug(`📝 Title applied: ${newTitle}`);
}

/**
 * Восстановление оригинального заголовка
 */
function restoreTitle(): void {
    // Если нет префикса — ничего не делаем
    if (!hasPrefix()) {
        return;
    }

    // Пытаемся получить сохранённый оригинал
    let original = getStoredOriginalTitle();
    if (!original) {
        // Если не сохранили — пробуем вырезать префикс
        original = document.title.slice(PREFIX.length);
    }

    // Защита от пустого заголовка
    if (!original) {
        original = 'max.ru';
    }

    safeSetTitle(original);
    logger.debug(`📝 Title restored: ${original}`);
}

/**
 * Синхронизация состояния (проверяет storage и применяет/восстанавливает)
 */
function syncTitle(): void {
    const enabled = storage.getBoolean(TITLE_STORAGE_KEY);
    
    if (enabled) {
        applyTitle();
    } else {
        restoreTitle();
    }
}

// ============================================================
// ПУБЛИЧНЫЙ API
// ============================================================

/**
 * Применение текущего состояния (для registry)
 */
export function apply(): void {
    const enabled = storage.getBoolean(TITLE_STORAGE_KEY);
    
    if (enabled) {
        applyTitle();
    } else {
        restoreTitle();
    }
}

/**
 * Включение функции
 */
export function enable(): void {
    storage.setBoolean(TITLE_STORAGE_KEY, true);
    applyTitle();
    logger.info('📝 Title prefix enabled');
}

/**
 * Отключение функции
 */
export function disable(): void {
    storage.setBoolean(TITLE_STORAGE_KEY, false);
    restoreTitle();
    logger.info('📝 Title prefix disabled');
}

/**
 * Переключение состояния
 */
export function toggle(): boolean {
    const current = storage.getBoolean(TITLE_STORAGE_KEY);
    const newState = !current;
    storage.setBoolean(TITLE_STORAGE_KEY, newState);

    if (newState) {
        applyTitle();
        logger.info('📝 Title prefix enabled (toggle)');
    } else {
        restoreTitle();
        logger.info('📝 Title prefix disabled (toggle)');
    }

    return newState;
}

/**
 * Обновление заголовка при изменении (вызывается из MutationObserver)
 */
export function updateOnTitleChange(): void {
    // Если функция включена — применяем префикс
    const enabled = storage.getBoolean(TITLE_STORAGE_KEY);
    if (enabled && !hasPrefix()) {
        applyTitle();
    }
}

// ============================================================
// АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ПРИ ИЗМЕНЕНИИ ЗАГОЛОВКА
// ============================================================

let titleObserver: MutationObserver | null = null;
let isObserving = false;

/**
 * Запуск наблюдения за изменением заголовка
 */
export function startTitleObserver(): void {
    if (isObserving) return;

    const target = document.querySelector('head title');
    if (!target) return;

    titleObserver = new MutationObserver(() => {
        // Небольшая задержка, чтобы избежать конфликтов
        setTimeout(() => {
            updateOnTitleChange();
        }, 50);
    });

    titleObserver.observe(target, {
        childList: true,
        characterData: true,
        subtree: true,
    });

    isObserving = true;
    logger.debug('📝 Title observer started');
}

/**
 * Остановка наблюдения за заголовком
 */
export function stopTitleObserver(): void {
    if (titleObserver) {
        titleObserver.disconnect();
        titleObserver = null;
        isObserving = false;
        logger.debug('📝 Title observer stopped');
    }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

// При загрузке запускаем наблюдатель
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        startTitleObserver();
    });
} else {
    startTitleObserver();
}

// ============================================================
// ОЧИСТКА ПРИ ВЫГРУЗКЕ
// ============================================================

window.addEventListener('beforeunload', () => {
    stopTitleObserver();
});

// Экспортируем для совместимости
export default {
    enable,
    disable,
    toggle,
    apply,
    startTitleObserver,
    stopTitleObserver,
};