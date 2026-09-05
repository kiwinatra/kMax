// src/core/cache.ts

type CacheEntry<T> = {
    value: T;
    timestamp: number;
    ttl: number;
};

class DOMCache {
    private cache = new Map<string, CacheEntry<any>>();
    private defaultTTL = 5000; // 5 секунд

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    set<T>(key: string, value: T, ttl?: number): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Инвалидация по префиксу
    invalidateByPrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    // Инвалидация по регулярному выражению
    invalidateByRegex(regex: RegExp): void {
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
}

export const domCache = new DOMCache();