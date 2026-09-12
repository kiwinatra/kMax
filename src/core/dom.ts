/*
* @author: potemk.in
* @brief: DOM utilities — selection, creation, waiting, class/style helpers.
* @desc: All functions are safe (never throw), typed, and cheap. waitForElement
*       now uses a single MutationObserver + optional timeout — no setInterval
*       double-work. Batch style updates stay (deferred to next tick) for cases
*       where many elements need restyling without layout thrash.
*/

// ============================================================
// SELECTION
// ============================================================

export function qs<T extends Element = Element>(
    selector: string,
    context: ParentNode = document
): T | null {
    try {
        return context.querySelector<T>(selector);
    } catch {
        return null;
    }
}

export function qsa<T extends Element = Element>(
    selector: string,
    context: ParentNode = document
): T[] {
    try {
        return Array.from(context.querySelectorAll<T>(selector));
    } catch {
        return [];
    }
}

export function exists(selector: string, context: ParentNode = document): boolean {
    return qs(selector, context) !== null;
}

// ============================================================
// CREATION
// ============================================================

export interface ElementOptions<K extends keyof HTMLElementTagNameMap = keyof HTMLElementTagNameMap> {
    className?: string;
    id?: string;
    text?: string;
    html?: string;
    attrs?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    events?: Record<string, EventListener>;
    dataset?: Record<string, string>;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: ElementOptions<K> = {}
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);

    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.text) el.textContent = options.text;
    if (options.html) el.innerHTML = options.html;

    if (options.attrs) {
        for (const [key, value] of Object.entries(options.attrs)) {
            el.setAttribute(key, value);
        }
    }

    if (options.styles) {
        Object.assign(el.style, options.styles);
    }

    if (options.dataset) {
        for (const [key, value] of Object.entries(options.dataset)) {
            el.dataset[key] = value;
        }
    }

    if (options.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            el.addEventListener(event, handler);
        }
    }

    return el;
}

export function createSimpleElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text?: string,
    className?: string
): HTMLElementTagNameMap[K] {
    return createElement(tag, { text, className });
}

export function cloneElement<T extends Element>(el: T, deep: boolean = true): T {
    return el.cloneNode(deep) as T;
}

// ============================================================
// BULK OPERATIONS
// ============================================================

export function removeElements(selector: string, context: ParentNode = document): number {
    const elements = qsa(selector, context);
    for (const el of elements) el.remove();
    return elements.length;
}

export function hideElements(selector: string, context: ParentNode = document): number {
    const elements = qsa<HTMLElement>(selector, context);
    let count = 0;
    for (const el of elements) {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
            count++;
        }
    }
    return count;
}

export function showElements(selector: string, context: ParentNode = document): number {
    const elements = qsa<HTMLElement>(selector, context);
    let count = 0;
    for (const el of elements) {
        if (el.style.display === 'none') {
            el.style.display = '';
            count++;
        }
    }
    return count;
}

export function toggleElements(selector: string, context: ParentNode = document): number {
    const elements = qsa<HTMLElement>(selector, context);
    for (const el of elements) {
        el.style.display = el.style.display === 'none' ? '' : 'none';
    }
    return elements.length;
}

// ============================================================
// WAITING
// ============================================================

export interface WaitOptions {
    timeout?: number;
    throwOnTimeout?: boolean;
}

/**
 * Wait for a selector to appear. Uses a single MutationObserver + timeout.
 * Returns the first match, or null if throwOnTimeout is false and timeout hits.
 */
export function waitForElement<T extends Element = Element>(
    selector: string,
    options: WaitOptions = {}
): Promise<T> {
    const { timeout = 10000, throwOnTimeout = true } = options;

    return new Promise((resolve, reject) => {
        // Fast path: already there
        const existing = qs<T>(selector);
        if (existing) {
            resolve(existing);
            return;
        }

        let timer: number | null = null;
        let observer: MutationObserver | null = null;

        const cleanup = (): void => {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        };

        observer = new MutationObserver(() => {
            const el = qs<T>(selector);
            if (el) {
                cleanup();
                resolve(el);
            }
        });

        // Observe documentElement so we catch additions even before <body> is ready
        const target = document.body || document.documentElement;
        observer.observe(target, { childList: true, subtree: true });

        if (timeout > 0) {
            timer = window.setTimeout(() => {
                cleanup();
                if (throwOnTimeout) {
                    reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
                } else {
                    resolve(null as unknown as T);
                }
            }, timeout);
        }
    });
}

/** Wait for a selector and return all matching elements. */
export function waitForElements<T extends Element = Element>(
    selector: string,
    options: WaitOptions = {}
): Promise<T[]> {
    return waitForElement(selector, options).then((el) => {
        if (!el) return [];
        return qsa<T>(selector);
    });
}

// ============================================================
// CLASS HELPERS
// ============================================================

export function hasClass(el: Element, className: string): boolean {
    try {
        return el.classList.contains(className);
    } catch {
        return false;
    }
}

export function addClass(el: Element, className: string): void {
    try {
        el.classList.add(className);
    } catch {}
}

export function removeClass(el: Element, className: string): void {
    try {
        el.classList.remove(className);
    } catch {}
}

export function toggleClass(el: Element, className: string, force?: boolean): boolean {
    try {
        return el.classList.toggle(className, force);
    } catch {
        return false;
    }
}

export function replaceClass(el: Element, oldClass: string, newClass: string): void {
    try {
        if (el.classList.contains(oldClass)) {
            el.classList.remove(oldClass);
            el.classList.add(newClass);
        }
    } catch {}
}

// ============================================================
// TREE NAVIGATION
// ============================================================

export function findParent(el: Element, selector: string): Element | null {
    try {
        let parent = el.parentElement;
        while (parent) {
            if (parent.matches(selector)) return parent;
            parent = parent.parentElement;
        }
    } catch {}
    return null;
}

export function findParentByClass(el: Element, className: string): Element | null {
    return findParent(el, `.${className}`);
}

export function closest<T extends Element = Element>(el: Element, selector: string): T | null {
    try {
        return el.closest<T>(selector);
    } catch {
        return null;
    }
}

// ============================================================
// VISIBILITY
// ============================================================

export function isVisible(el: HTMLElement): boolean {
    return el.offsetParent !== null || el.style.display !== 'none';
}

export function isInDOM(el: Element): boolean {
    return document.contains(el);
}

// ============================================================
// READ / WRITE
// ============================================================

export function getText(el: Element): string {
    return el.textContent?.trim() || '';
}

export function getAttr(el: Element, attr: string): string | null {
    try {
        return el.getAttribute(attr);
    } catch {
        return null;
    }
}

export function insertAfter(el: Element, referenceNode: Element): void {
    try {
        referenceNode.parentNode?.insertBefore(el, referenceNode.nextSibling);
    } catch {}
}

export function insertBefore(el: Element, referenceNode: Element): void {
    try {
        referenceNode.parentNode?.insertBefore(el, referenceNode);
    } catch {}
}

export function appendTo(el: Element, parent: Element): void {
    try {
        parent.appendChild(el);
    } catch {}
}

export function prependTo(el: Element, parent: Element): void {
    try {
        parent.prepend(el);
    } catch {}
}

export function updateText(el: Element, text: string): void {
    try {
        if (el.textContent !== text) el.textContent = text;
    } catch {}
}

export function updateHTML(el: Element, html: string): void {
    try {
        if (el.innerHTML !== html) el.innerHTML = html;
    } catch {}
}

export function updateStyle(el: HTMLElement, property: string, value: string): void {
    try {
        (el.style as any)[property] = value;
    } catch {}
}

// ============================================================
// BATCH STYLE UPDATES
// ============================================================

interface StyleTask {
    el: HTMLElement;
    prop: string;
    value: string;
}

let styleBatch: StyleTask[] = [];
let styleBatchTimer: number | null = null;
const STYLE_BATCH_DELAY = 50;

export function batchStyleUpdate(el: HTMLElement, prop: string, value: string): void {
    styleBatch.push({ el, prop, value });
    if (styleBatchTimer !== null) return;
    styleBatchTimer = window.setTimeout(flushStyleBatch, STYLE_BATCH_DELAY);
}

export function flushStyleBatch(): void {
    if (styleBatchTimer !== null) {
        clearTimeout(styleBatchTimer);
        styleBatchTimer = null;
    }
    if (styleBatch.length === 0) return;

    const batch = styleBatch;
    styleBatch = [];

    for (const { el, prop, value } of batch) {
        try {
            (el.style as any)[prop] = value;
        } catch {}
    }
}

// ============================================================
// FACADE (optional grouped API)
// ============================================================

export const dom = {
    qs,
    qsa,
    exists,
    createElement,
    createSimpleElement,
    cloneElement,
    removeElements,
    hideElements,
    showElements,
    toggleElements,
    waitForElement,
    waitForElements,
    hasClass,
    addClass,
    removeClass,
    toggleClass,
    replaceClass,
    findParent,
    findParentByClass,
    closest,
    isVisible,
    isInDOM,
    getText,
    getAttr,
    insertAfter,
    insertBefore,
    appendTo,
    prependTo,
    updateText,
    updateHTML,
    updateStyle,
    batchStyleUpdate,
    flushStyleBatch,
};