/*
* @author: potemk.in
* @brief: DOM mutation observer with batched callbacks, idle management, and self-change ignoring.
* @desc: This file implements a MutationObserver wrapper that manages DOM change detection with performance optimizations including RAF batching, idle timeout for automatic pausing, and the ability to ignore mutations caused by the mod itself. Multiple callbacks can be registered and unregistered dynamically.
*/

type ObserverCallback = () => void;

let observer: MutationObserver | null = null;
let callbacks: ObserverCallback[] = [];
let isObserving = false;
let rafId: number | null = null;
let pendingMutations = false;
let idleTimer: number | null = null;
const IDLE_TIMEOUT = 5000;

const DEFAULT_OPTIONS: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
};

let isUpdating = false;

// Function for resuming the observer
function resumeObserver(): void {
    if (!observer || isObserving) return;
    try {
        observer.observe(document.body, DEFAULT_OPTIONS);
        isObserving = true;
    } catch {}
}

// Function for pausing the observer
function pauseObserver(): void {
    if (!observer || !isObserving) return;
    try {
        observer.disconnect();
        isObserving = false;
    } catch {}
}

// Function for resetting the idle timer
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

// Function for starting DOM observation with a callback
export function watchDOM(callback: ObserverCallback): () => void {
    callbacks.push(callback);
    resumeObserver();
    resetIdleTimer();

    if (!observer) {
        observer = new MutationObserver((mutations) => {
            if (isUpdating) return;

            resetIdleTimer();
            if (!pendingMutations) {
                pendingMutations = true;
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    pendingMutations = false;
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

// Function for unregistering one or all callbacks
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

// Function for checking if the observer is active
export function isObserverActive(): boolean {
    return isObserving && observer !== null;
}

// Function for getting the number of registered callbacks
export function getObserverCallbackCount(): number {
    return callbacks.length;
}

// Function for clearing all observers
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

// Function for marking the start of a self-initiated update
export function startUpdating(): void {
    isUpdating = true;
}

// Function for marking the end of a self-initiated update
export function endUpdating(): void {
    isUpdating = false;
}

// Function for executing a function while ignoring DOM changes
export function withUpdating<T>(fn: () => T): T {
    startUpdating();
    try {
        return fn();
    } finally {
        endUpdating();
    }
}