// src/core/observer.ts

type ObserverCallback = () => void;

let observer: MutationObserver | null = null;
let callbacks: ObserverCallback[] = [];
let isObserving = false;
let rafId: number | null = null;
let pendingMutations = false;
let idleTimer: number | null = null;
const IDLE_TIMEOUT = 5000; // 5 секунд бездействия → пауза

const DEFAULT_OPTIONS: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: false, // ← отключаем для производительности
    attributes: false,    // ← отключаем для производительности
};

// Флаг для игнорирования собственных изменений
let isUpdating = false;

function resumeObserver(): void {
    if (!observer || isObserving) return;
    try {
        observer.observe(document.body, DEFAULT_OPTIONS);
        isObserving = true;
    } catch {}
}

function pauseObserver(): void {
    if (!observer || !isObserving) return;
    try {
        observer.disconnect();
        isObserving = false;
    } catch {}
}

function resetIdleTimer(): void {
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    idleTimer = window.setTimeout(() => {
        idleTimer = null;
        if (callbacks.length === 0) {
            pauseObserver();
        }
    }, IDLE_TIMEOUT);
}

export function watchDOM(callback: ObserverCallback): () => void {
    callbacks.push(callback);
    resumeObserver();
    resetIdleTimer();

    if (!observer) {
        observer = new MutationObserver((mutations) => {
            // Если изменения вызваны самим модом — игнорируем
            if (isUpdating) return;

            resetIdleTimer();
            if (!pendingMutations) {
                pendingMutations = true;
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    pendingMutations = false;
                    // Выполняем все колбэки
                    for (const cb of callbacks) {
                        try {
                            cb();
                        } catch (error) {
                            console.error('[KMOD] Observer callback error:', error);
                        }
                    }
                });
            }
        });
        try {
            observer.observe(document.body, DEFAULT_OPTIONS);
            isObserving = true;
        } catch (error) {
            console.error('[KMOD] Failed to start observer:', error);
            observer = null;
            isObserving = false;
        }
    }

    return () => {
        callbacks = callbacks.filter(cb => cb !== callback);
        if (callbacks.length === 0) {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            pendingMutations = false;
            pauseObserver();
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }
        }
    };
}

export function unwatchDOM(callback?: ObserverCallback): void {
    if (callback) {
        callbacks = callbacks.filter(cb => cb !== callback);
    } else {
        callbacks = [];
    }
    if (callbacks.length === 0 && observer) {
        pauseObserver();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        pendingMutations = false;
    }
}

export function isObserverActive(): boolean {
    return isObserving && observer !== null;
}

export function getObserverCallbackCount(): number {
    return callbacks.length;
}

export function clearObservers(): void {
    callbacks = [];
    if (observer) {
        pauseObserver();
        observer = null;
    }
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    pendingMutations = false;
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}

// ===== ФУНКЦИИ ДЛЯ ИГНОРИРОВАНИЯ СОБСТВЕННЫХ ИЗМЕНЕНИЙ =====
export function startUpdating(): void {
    isUpdating = true;
}

export function endUpdating(): void {
    isUpdating = false;
}

export function withUpdating<T>(fn: () => T): T {
    startUpdating();
    try {
        return fn();
    } finally {
        endUpdating();
    }
}