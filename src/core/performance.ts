// src/core/performance.ts

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

export function whenIdle(callback: () => void, timeout: number = 2000): void {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => callback(), { timeout });
    } else {
        setTimeout(callback, 100);
    }
}

export function isTabVisible(): boolean {
    return document.visibilityState === 'visible';
}

export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
    const handler = () => callback(isTabVisible());
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
}