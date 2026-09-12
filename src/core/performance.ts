/*
* @author: potemk.in
* @brief: Performance utilities — throttling, debouncing, idle scheduling.
* @desc: Small set of rate-limiting and scheduling helpers. whenIdle is the
*       only one used by the bootstrap; throttle/debounce are kept as tiny
*       shared utilities for future features. Tab-visibility helpers are
*       provided for features that need to pause when hidden — the central
*       observer already handles its own visibility, so this is opt-in.
*/

// ============================================================
// THROTTLE
// ============================================================

/**
 * Call `fn` at most once per `limit` ms.
 * Executes immediately on first call, then schedules the last call.
 */
export function throttle<T extends (...args: any[]) => void>(
    fn: T,
    limit: number
): T {
    let inThrottle = false;
    let lastArgs: any[] | null = null;
    let lastThis: any = null;

    return function (this: any, ...args: any[]) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn.apply(lastThis, lastArgs);
                    lastArgs = null;
                    lastThis = null;
                }
            }, limit);
        } else {
            lastArgs = args;
            lastThis = this;
        }
    } as T;
}

// ============================================================
// DEBOUNCE
// ============================================================

/**
 * Call `fn` only after `delay` ms of silence.
 */
export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): T {
    let timer: number | null = null;

    return function (this: any, ...args: any[]) {
        if (timer !== null) clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, delay);
    } as T;
}

// ============================================================
// IDLE SCHEDULING
// ============================================================

/**
 * Run callback when the browser is idle, or after `timeout` ms at the latest.
 * Falls back to setTimeout on browsers without requestIdleCallback.
 */
export function whenIdle(callback: () => void, timeout: number = 2000): void {
    if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(() => callback(), { timeout });
    } else {
        window.setTimeout(callback, 100);
    }
}

// ============================================================
// TAB VISIBILITY
// ============================================================

export function isTabVisible(): boolean {
    return document.visibilityState === 'visible';
}

export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
    const handler = (): void => callback(isTabVisible());
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
}