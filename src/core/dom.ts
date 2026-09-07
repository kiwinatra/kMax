/*
* @author: potemk.in
* @brief: Core DOM utilities for safe and efficient DOM manipulation with type safety and error handling.
* @desc: This file provides a comprehensive set of DOM utilities including element selection, creation, manipulation, waiting for elements, class management, navigation, and batch style updates. All functions are type-safe and handle errors gracefully without throwing.
*/

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

export type ElementOptions<K extends keyof HTMLElementTagNameMap> = {
  className?: string;
  id?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  styles?: Partial<CSSStyleDeclaration>;
  events?: Record<string, EventListener>;
  dataset?: Record<string, string>;
};

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions<K> = {}
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (options.className) {
    el.className = options.className;
  }

  if (options.id) {
    el.id = options.id;
  }

  if (options.text) {
    el.textContent = options.text;
  }

  if (options.html) {
    el.innerHTML = options.html;
  }

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
  return createElement(tag, {
    text,
    className,
  });
}

export function cloneElement<T extends Element>(el: T, deep: boolean = true): T {
  return el.cloneNode(deep) as T;
}

export function removeElements(selector: string, context: ParentNode = document): number {
  const elements = qsa(selector, context);
  let count = 0;
  for (const el of elements) {
    el.remove();
    count++;
  }
  return count;
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
  let count = 0;
  for (const el of elements) {
    el.style.display = el.style.display === 'none' ? '' : 'none';
    count++;
  }
  return count;
}

export interface WaitOptions {
  timeout?: number;
  interval?: number;
  throwOnTimeout?: boolean;
}

export function waitForElement<T extends Element = Element>(
  selector: string,
  options: WaitOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    interval = 100,
    throwOnTimeout = true,
  } = options;

  return new Promise((resolve, reject) => {
    const existing = qs<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timer: number | null = null;
    let intervalId: number | null = null;

    const observer = new MutationObserver(() => {
      const el = qs<T>(selector);
      if (el) {
        cleanup();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    intervalId = window.setInterval(() => {
      const el = qs<T>(selector);
      if (el) {
        cleanup();
        resolve(el);
      }
    }, interval);

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

    function cleanup(): void {
      observer.disconnect();
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  });
}

export function waitForElements<T extends Element = Element>(
  selector: string,
  options: WaitOptions = {}
): Promise<T[]> {
  return waitForElement(selector, options).then((el) => {
    if (!el) return [];
    return qsa<T>(selector);
  });
}

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
  } catch {
    // тихо
  }
}

export function removeClass(el: Element, className: string): void {
  try {
    el.classList.remove(className);
  } catch {
    // тихо
  }
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
  } catch {
    // тихо
  }
}

export function findParent(el: Element, selector: string): Element | null {
  try {
    let parent = el.parentElement;
    while (parent) {
      if (parent.matches(selector)) {
        return parent;
      }
      parent = parent.parentElement;
    }
  } catch {
    // тихо
  }
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

export function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.style.display !== 'none';
}

export function isInDOM(el: Element): boolean {
  return document.contains(el);
}

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
  } catch {
    // тихо
  }
}

export function insertBefore(el: Element, referenceNode: Element): void {
  try {
    referenceNode.parentNode?.insertBefore(el, referenceNode);
  } catch {
    // тихо
  }
}

export function appendTo(el: Element, parent: Element): void {
  try {
    parent.appendChild(el);
  } catch {
    // тихо
  }
}

export function prependTo(el: Element, parent: Element): void {
  try {
    parent.prepend(el);
  } catch {
    // тихо
  }
}

export function updateText(el: Element, text: string): void {
  try {
    if (el.textContent !== text) {
      el.textContent = text;
    }
  } catch {
    // тихо
  }
}

export function updateHTML(el: Element, html: string): void {
  try {
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  } catch {
    // тихо
  }
}

export function updateStyle(el: HTMLElement, property: string, value: string): void {
  try {
    (el.style as any)[property] = value;
  } catch {
    // тихо
  }
}

let styleBatch: Array<{ el: HTMLElement; prop: string; value: string }> = [];
let styleBatchTimer: number | null = null;
const STYLE_BATCH_DELAY = 50;

export function batchStyleUpdate(el: HTMLElement, prop: string, value: string): void {
    styleBatch.push({ el, prop, value });
    if (!styleBatchTimer) {
        styleBatchTimer = window.setTimeout(() => {
            styleBatchTimer = null;
            const batch = styleBatch;
            styleBatch = [];
            for (const item of batch) {
                try {
                    (item.el.style as any)[item.prop] = item.value;
                } catch {}
            }
        }, STYLE_BATCH_DELAY);
    }
}

export function flushStyleBatch(): void {
    if (styleBatchTimer) {
        clearTimeout(styleBatchTimer);
        styleBatchTimer = null;
    }
    const batch = styleBatch;
    styleBatch = [];
    for (const item of batch) {
        try {
            (item.el.style as any)[item.prop] = item.value;
        } catch {}
    }
}

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
};