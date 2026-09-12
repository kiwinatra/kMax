/*
* @author: potemk.in
* @brief: Centralized DOM mutation observer with rAF batching, idle management, and selective node processing.
* @desc: A single global MutationObserver that dispatches batched callbacks once per animation frame. Callbacks receive the list of added nodes so features can process only what changed instead of re-scanning the whole document. Supports pause/resume, idle timeout, and a self-update guard to ignore mutations produced by the mod itself.
*/

export interface ObserverBatch {
    /** Nodes newly added anywhere in the tree this frame. */
    addedNodes: Node[];
    /** Text nodes whose content changed this frame. */
    characterDataNodes: Node[];
    /** Elements whose tracked attributes changed this frame. */
    attributeNodes: Element[];
    /** Raw records for advanced use cases. */
    records: MutationRecord[];
}

export type ObserverCallback = (batch: ObserverBatch) => void;

interface Subscriber {
    id: number;
    callback: ObserverCallback;
    /** Optional: only call this subscriber when one of these selectors matches an added node. */
    filterSelectors?: string[];
}

// ============================================================
// STATE
// ============================================================

let observer: MutationObserver | null = null;
let subscribers: Subscriber[] = [];
let nextId = 1;
let isObserving = false;
let rafId: number | null = null;
let idleTimer: number | null = null;
let isUpdating = false;

/** Accumulates nodes between frames. */
let pendingAdded: Node[] = [];
let pendingCharacterData: Node[] = [];
let pendingAttributes: Element[] = [];
let pendingRecords: MutationRecord[] = [];
let pendingDirty = false;

const IDLE_TIMEOUT = 10000; // pause observer if no DOM changes for 10s
const MAX_BATCH_NODES = 2000; // hard cap to avoid runaway memory in pathological cases

const OBSERVER_OPTIONS: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'src', 'data-*'],
};

// ============================================================
// SUBSCRIPTION
// ============================================================

/**
 * Register a callback to be invoked on every batched DOM change.
 * Returns an unsubscribe function.
 */
export function watchDOM(callback: ObserverCallback, filterSelectors?: string[]): () => void {
    const sub: Subscriber = { id: nextId++, callback, filterSelectors };
    subscribers.push(sub);
    resumeObserver();
    resetIdleTimer();

    return () => {
        subscribers = subscribers.filter(s => s.id !== sub.id);
        if (subscribers.length === 0) {
            stopObserver();
        }
    };
}

/**
 * Remove one or all subscribers.
 */
export function unwatchDOM(callback?: ObserverCallback): void {
    if (callback) {
        subscribers = subscribers.filter(s => s.callback !== callback);
    } else {
        subscribers = [];
    }
    if (subscribers.length === 0) {
        stopObserver();
    }
}

// ============================================================
// OBSERVER LIFECYCLE
// ============================================================

function startObserver(): void {
    if (observer || isObserving) return;
    try {
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, OBSERVER_OPTIONS);
        isObserving = true;
    } catch (error) {
        console.error('[KMOD] Failed to start observer:', error);
        observer = null;
        isObserving = false;
    }
}

function stopObserver(): void {
    if (!observer) return;
    try {
        observer.disconnect();
    } catch {}
    observer = null;
    isObserving = false;
    pendingAdded = [];
    pendingCharacterData = [];
    pendingAttributes = [];
    pendingRecords = [];
    pendingDirty = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}

function resumeObserver(): void {
    startObserver();
}

function pauseObserver(): void {
    if (!observer || !isObserving) return;
    try {
        observer.disconnect();
    } catch {}
    isObserving = false;
}

function resetIdleTimer(): void {
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
    idleTimer = window.setTimeout(() => {
        idleTimer = null;
        // Pause only if tab is hidden or no subscribers
        if (subscribers.length === 0 || document.visibilityState === 'hidden') {
            pauseObserver();
        }
    }, IDLE_TIMEOUT);
}

// ============================================================
// MUTATION HANDLING
// ============================================================

function onMutations(records: MutationRecord[]): void {
    // Ignore mutations we caused ourselves (avoid feedback loops)
    if (isUpdating) return;

    resetIdleTimer();

    for (const rec of records) {
        if (rec.type === 'childList') {
            for (const n of rec.addedNodes) {
                if (pendingAdded.length < MAX_BATCH_NODES) {
                    pendingAdded.push(n);
                }
            }
        } else if (rec.type === 'characterData' && rec.target) {
            if (pendingCharacterData.length < MAX_BATCH_NODES) {
                pendingCharacterData.push(rec.target);
            }
        } else if (rec.type === 'attributes' && rec.target instanceof Element) {
            if (pendingAttributes.length < MAX_BATCH_NODES) {
                pendingAttributes.push(rec.target);
            }
        }
        pendingRecords.push(rec);
    }

    pendingDirty = true;

    if (!rafId) {
        rafId = requestAnimationFrame(flush);
    }
}

function flush(): void {
    rafId = null;
    if (!pendingDirty) return;

    const batch: ObserverBatch = {
        addedNodes: pendingAdded,
        characterDataNodes: pendingCharacterData,
        attributeNodes: pendingAttributes,
        records: pendingRecords,
    };

    // Reset buffers before dispatch so callbacks that trigger mutations
    // during the call don't pollute this batch.
    pendingAdded = [];
    pendingCharacterData = [];
    pendingAttributes = [];
    pendingRecords = [];
    pendingDirty = false;

    // Snapshot subscribers in case one unsubscribes during iteration.
    const snapshot = subscribers.slice();
    for (const sub of snapshot) {
        try {
            if (sub.filterSelectors && sub.filterSelectors.length > 0) {
                if (!matchesAny(batch.addedNodes, sub.filterSelectors)) {
                    continue;
                }
            }
            sub.callback(batch);
        } catch (error) {
            console.error('[KMOD] Observer callback error:', error);
        }
    }
}

/** Returns true if any added node (or descendant) matches one of the selectors. */
function matchesAny(nodes: Node[], selectors: string[]): boolean {
    for (const node of nodes) {
        if (!(node instanceof Element)) {
            if (node.parentElement) {
                for (const sel of selectors) {
                    try {
                        if (node.parentElement.matches(sel)) return true;
                    } catch {}
                }
            }
            continue;
        }
        for (const sel of selectors) {
            try {
                if (node.matches(sel) || node.querySelector(sel)) return true;
            } catch {}
        }
    }
    return false;
}

// ============================================================
// SELF-UPDATE GUARD
// ============================================================

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

// ============================================================
// INTROSPECTION
// ============================================================

export function isObserverActive(): boolean {
    return isObserving && observer !== null;
}

export function getObserverCallbackCount(): number {
    return subscribers.length;
}

export function clearObservers(): void {
    subscribers = [];
    stopObserver();
}

// ============================================================
// VISIBILITY INTEGRATION
// ============================================================

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && subscribers.length > 0) {
            resumeObserver();
            resetIdleTimer();
        }
    });
}