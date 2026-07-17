import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
    // jsdom does not implement matchMedia; antd responsive hooks need it.
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // jsdom (v23) does not implement Web Storage, so `window.localStorage` /
    // `sessionStorage` are undefined. Provide a minimal in-memory Storage so tests
    // can read/write/clear without each hand-rolling its own stub. Defined as
    // configurable + writable so tests that need a spy can still override it
    // (`vi.stubGlobal('localStorage', …)` or `Object.defineProperty`).
    class MemoryStorage implements Storage {
        private store = new Map<string, string>();

        get length(): number {
            return this.store.size;
        }

        clear(): void {
            this.store.clear();
        }

        getItem(key: string): string | null {
            return this.store.has(key) ? (this.store.get(key) as string) : null;
        }

        key(index: number): string | null {
            return Array.from(this.store.keys())[index] ?? null;
        }

        removeItem(key: string): void {
            this.store.delete(key);
        }

        setItem(key: string, value: string): void {
            this.store.set(key, String(value));
        }
    }

    (['localStorage', 'sessionStorage'] as const).forEach((name) => {
        if (!window[name]) {
            Object.defineProperty(window, name, {
                configurable: true,
                writable: true,
                value: new MemoryStorage(),
            });
        }
    });

    // antd/rc-util call getComputedStyle with a pseudo-element to measure scrollbars.
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    window.getComputedStyle = ((element: Element, pseudoElt?: string | null) => {
        if (pseudoElt) {
            return {
                getPropertyValue: () => '',
                width: '0px',
                height: '0px',
            } as unknown as CSSStyleDeclaration;
        }

        return originalGetComputedStyle(element);
    }) as typeof window.getComputedStyle;
}

// Prevent fake-timer leakage between test files when a test forgets to restore.
afterEach(() => {
    vi.useRealTimers();
});
