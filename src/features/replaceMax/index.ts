/*
* @author: potemk.in
* @brief: Replaces "Max" → "MAX" in visible text (excluding "kMax").
* @desc: Batch-aware feature. When the registry passes an ObserverBatch, only characterData nodes and text descendants of added nodes are processed. On enable or manual apply() without a batch, falls back to a full TreeWalker scan. Originals are tracked in a Map so disable() can restore them. Detached nodes are pruned periodically to avoid leaks. No local observer, no timers.
*
* NOTE: This feature requires the registry to pass the ObserverBatch to apply().
*       See registry.ts — applyOnMutations(batch) should call feature.apply(batch).
*/

import { logger } from '../../core/logger';
import { storage } from '../../core/storage';
import { ObserverBatch } from '../../core/observer';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_TEXT_LENGTH = 10000;
const MAX_ORIGINALS = 5000;
const PRUNE_THRESHOLD = 1000;

const REPLACE_REGEX = /(?<!k)Max/g;

// ============================================================
// STATE
// ============================================================

let isEnabled = false;

/** Original text content for every node we've modified. */
const originalTexts = new Map<Text, string>();

// ============================================================
// CORE TRANSFORM
// ============================================================

function shouldProcess(text: string): boolean {
    return (
        text.length > 0 &&
        text.length <= MAX_TEXT_LENGTH &&
        text.includes('Max') &&
        !text.includes('kMax')
    );
}

function processTextNode(node: Text): boolean {
    const text = node.textContent || '';

    // Already transformed — skip (content matches our output)
    const prevOriginal = originalTexts.get(node);
    if (prevOriginal !== undefined && text === prevOriginal.replace(REPLACE_REGEX, 'MAX')) {
        return false;
    }

    if (!shouldProcess(text)) {
        if (prevOriginal !== undefined) originalTexts.delete(node);
        return false;
    }

    originalTexts.set(node, text);
    node.textContent = text.replace(REPLACE_REGEX, 'MAX');
    return true;
}

function restoreNode(node: Text, original: string): boolean {
    if (node.textContent !== original) {
        node.textContent = original;
        return true;
    }
    return false;
}

// ============================================================
// BATCH PROCESSING
// ============================================================

/** Walk text descendants of an element and process each. */
function processElementText(element: Element): number {
    let count = 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
        if (processTextNode(node)) count++;
    }
    return count;
}

function processBatch(batch: ObserverBatch): void {
    let processed = 0;

    // 1. Direct text mutations
    for (const node of batch.characterDataNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (processTextNode(node as Text)) processed++;
        }
    }

    // 2. Text inside newly added nodes
    for (const node of batch.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            processed += processElementText(node as Element);
        } else if (node.nodeType === Node.TEXT_NODE) {
            if (processTextNode(node as Text)) processed++;
        }
    }

    if (processed > 0) {
        logger.debug(`🔄 Replaced "Max" → "MAX" in ${processed} text node(s) [batch]`);
    }
}

// ============================================================
// FULL SCAN
// ============================================================

function fullScan(): void {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    let processed = 0;
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
        if (processTextNode(node)) processed++;
    }

    if (processed > 0) {
        logger.debug(`🔄 Replaced "Max" → "MAX" in ${processed} text node(s) [full scan]`);
    }
}

// ============================================================
// RESTORE / PRUNE
// ============================================================

function restoreAll(): void {
    if (originalTexts.size === 0) return;

    let restored = 0;
    for (const [node, original] of originalTexts) {
        if (!document.contains(node)) continue;
        if (restoreNode(node, original)) restored++;
    }
    originalTexts.clear();

    if (restored > 0) {
        logger.debug(`🔄 Restored ${restored} text node(s)`);
    }
}

/** Remove entries for nodes that are no longer in the DOM. */
function pruneDetached(): void {
    if (originalTexts.size < PRUNE_THRESHOLD) return;

    let pruned = 0;
    for (const [node] of originalTexts) {
        if (!document.contains(node)) {
            originalTexts.delete(node);
            pruned++;
        }
    }

    // Hard cap
    if (originalTexts.size > MAX_ORIGINALS) {
        const excess = originalTexts.size - MAX_ORIGINALS;
        let i = 0;
        for (const key of originalTexts.keys()) {
            if (i++ >= excess) break;
            originalTexts.delete(key);
        }
    }

    if (pruned > 0) {
        logger.debug(`🧹 Pruned ${pruned} detached text nodes`);
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * If a batch is provided, only process changed/added nodes.
 * Otherwise, fall back to a full scan (used on enable / applyFeature).
 */
export function apply(batch?: ObserverBatch): void {
    if (!storage.getBoolean('replaceMax')) {
        restoreAll();
        return;
    }

    if (batch) {
        processBatch(batch);
        pruneDetached();
    } else {
        fullScan();
    }
}

export function enable(): void {
    if (isEnabled) return;
    isEnabled = true;
    logger.info('🔄 Replace "Max" → "MAX" enabled');
    fullScan();
}

export function disable(): void {
    if (!isEnabled) return;
    isEnabled = false;
    restoreAll();
    logger.info('🔄 Replace "Max" → "MAX" disabled');
}

export function toggle(): boolean {
    const newState = !storage.getBoolean('replaceMax');
    storage.setBoolean('replaceMax', newState);
    if (newState) enable();
    else disable();
    return newState;
}

export function isFeatureEnabled(): boolean {
    return isEnabled;
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        originalTexts.clear();
    });
}