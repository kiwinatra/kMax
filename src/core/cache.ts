/*
* @author: potemk.in
* @brief: In-memory DOM cache with TTL support for storing and retrieving DOM elements.
* @desc: This file implements a caching system for DOM elements with time-to-live (TTL) expiration. It provides methods for storing, retrieving, and invalidating cached entries by key, prefix, or regex pattern. Useful for reducing redundant DOM queries.
*/

type CacheEntry<T> = {
    value: T;
    timestamp: number;
    ttl: number;
};

class DOMCache {
    private cache = new Map<string, CacheEntry<any>>();
    private defaultTTL = 5000;

    // Function for retrieving a cached value by key
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    // Function for storing a value in the cache with optional TTL
    set<T>(key: string, value: T, ttl?: number): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
    }

    // Function for removing a specific entry from the cache
    delete(key: string): void {
        this.cache.delete(key);
    }

    // Function for clearing all entries from the cache
    clear(): void {
        this.cache.clear();
    }

    // Function for invalidating entries by key prefix
    invalidateByPrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    // Function for invalidating entries by regex pattern
    invalidateByRegex(regex: RegExp): void {
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
}

export const domCache = new DOMCache();