// src/core/observer.ts
type ObserverCallback = () => void;

let observer: MutationObserver | null = null;
let callbacks: ObserverCallback[] = [];

export function watchDOM(callback: ObserverCallback): () => void {
    callbacks.push(callback);
    
    if (!observer) {
        observer = new MutationObserver(() => {
            for (const cb of callbacks) {
                try {
                    cb();
                } catch (error) {
                    console.error('Observer callback error:', error);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    // Возвращаем функцию для отписки
    return () => {
        callbacks = callbacks.filter(cb => cb !== callback);
        
        if (callbacks.length === 0 && observer) {
            observer.disconnect();
            observer = null;
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
        observer.disconnect();
        observer = null;
    }
}