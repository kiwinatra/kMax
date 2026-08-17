// src/features/replaceMax/index.ts
import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { OFFSETS } from '../../offsets';

let isEnabled = false;
let lastRun = 0;
const MIN_INTERVAL = 2000;

function replaceMaxInText(): void {
    const now = Date.now();
    if (now - lastRun < MIN_INTERVAL) {
        return;
    }
    lastRun = now;

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tag = parent.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                if (node.textContent?.includes('Max') && !node.textContent?.includes('kMax')) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                
                return NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodesToReplace: Text[] = [];
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
        nodesToReplace.push(node);
    }

    let replaced = 0;
    for (const textNode of nodesToReplace) {
        const original = textNode.textContent || '';
        const updated = original.replace(/(?<!k)Max/g, 'MAX');
        
        if (original !== updated) {
            textNode.textContent = updated;
            replaced++;
        }
    }

    if (replaced > 0) {
        logger.debug(`Replaced "Max" → "MAX" in ${replaced} text nodes`);
    }
}

/**
 * Применяет замену текста, если фича включена.
 * Вызывается при загрузке и при каждом изменении DOM.
 */
export function apply(): void {
    if (isEnabled) {
        replaceMaxInText();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    apply();
    logger.info('🔄 Замена "Max" → "MAX" включена');
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    logger.info('🔄 Замена "Max" → "MAX" отключена (обнови страницу для возврата исходного текста)');
}

export function toggle(): boolean {
    const key = OFFSETS.storage.keys.replaceMax;
    const current = storage.getBoolean(key as any);
    const newState = !current;
    storage.setBoolean(key as any, newState);

    if (newState) {
        enable();
    } else {
        disable();
    }

    return newState;
}