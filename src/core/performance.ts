/*
* @author: potemk.in
* @brief: Performance utilities including throttling, debouncing, timing, idle execution, and tab visibility management.
* @desc: This file provides a collection of performance optimization utilities including throttle and debounce functions for rate-limiting function calls, performance measurement with warnings for slow operations, idle callback scheduling with fallback, and tab visibility detection with change listeners.
*/

// Function for throttling function calls to a specified limit
export function throttle<T extends (...args: any[]) => void>(
    fn: T,
    limit: number
): T {
    let inThrottle = false;
    let lastArgs: any[] | null = null;
    let lastThis: any = null;

    return function(this: any, ...args: any[]) {
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

// Function for debouncing function calls with a delay
export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): T {
    let timer: number | null = null;

    return function(this: any, ...args: any[]) {
        if (timer) clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, delay);
    } as T;
}

// Function for measuring execution time with performance warnings
export function measureTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
        return fn();
    } finally {
        const duration = performance.now() - start;
        if (duration > 10) {
            console.warn(`[KMOD] ⚠️ ${label} took ${duration.toFixed(2)}ms`);
        }
    }
}

// Function for scheduling a callback during idle time
export function whenIdle(callback: () => void, timeout: number = 2000): void {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => callback(), { timeout });
    } else {
        setTimeout(callback, 100);
    }
}

// Function for checking if the current tab is visible
export function isTabVisible(): boolean {
    return document.visibilityState === 'visible';
}

// Function for subscribing to tab visibility changes
export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
    const handler = () => callback(isTabVisible());
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
}