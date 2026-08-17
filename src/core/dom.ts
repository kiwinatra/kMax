// src/core/dom.ts
export function qs<T extends Element = Element>(selector: string, context: ParentNode = document): T | null {
    return context.querySelector<T>(selector);
}

export function qsa<T extends Element = Element>(selector: string, context: ParentNode = document): T[] {
    return Array.from(context.querySelectorAll<T>(selector));
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: {
        className?: string;
        id?: string;
        text?: string;
        html?: string;
        attrs?: Record<string, string>;
        styles?: Partial<CSSStyleDeclaration>;
        events?: Record<string, EventListener>;
    }
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);

    if (options?.className) el.className = options.className;
    if (options?.id) el.id = options.id;
    if (options?.text) el.textContent = options.text;
    if (options?.html) el.innerHTML = options.html;

    if (options?.attrs) {
        for (const [key, value] of Object.entries(options.attrs)) {
            el.setAttribute(key, value);
        }
    }

    if (options?.styles) {
        Object.assign(el.style, options.styles);
    }

    if (options?.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            el.addEventListener(event, handler);
        }
    }

    return el;
}

export function removeElements(selector: string): number {
    const elements = qsa(selector);
    let count = 0;
    for (const el of elements) {
        el.remove();
        count++;
    }
    return count;
}

export function hideElements(selector: string): number {
    const elements = qsa<HTMLElement>(selector);
    let count = 0;
    for (const el of elements) {
        el.style.display = 'none';
        count++;
    }
    return count;
}

export function showElements(selector: string): number {
    const elements = qsa<HTMLElement>(selector);
    let count = 0;
    for (const el of elements) {
        el.style.display = '';
        count++;
    }
    return count;
}

export function waitForElement<T extends Element = Element>(
    selector: string,
    timeout = 10000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const existing = qs<T>(selector);
        if (existing) {
            resolve(existing);
            return;
        }

        const observer = new MutationObserver(() => {
            const el = qs<T>(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        if (timeout > 0) {
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
            }, timeout);
        }
    });
}

export function hasClass(el: Element, className: string): boolean {
    return el.classList.contains(className);
}

export function addClass(el: Element, className: string): void {
    el.classList.add(className);
}

export function removeClass(el: Element, className: string): void {
    el.classList.remove(className);
}

export function toggleClass(el: Element, className: string): boolean {
    return el.classList.toggle(className);
}

export function findParent(el: Element, selector: string): Element | null {
    let parent = el.parentElement;
    while (parent) {
        if (parent.matches(selector)) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
}