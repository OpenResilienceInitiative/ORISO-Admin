import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Node >= 22 ships an experimental `localStorage`/`sessionStorage` global
// (node --localstorage-file). Under vitest it shadows jsdom's implementation
// with a stub whose methods (clear/getItem/...) are undefined unless a valid
// --localstorage-file path is provided, breaking any test that touches
// storage. Detect the broken stub and replace it with a spec-compliant
// in-memory Storage polyfill.
const createStorage = (): Storage => {
    let store = new Map<string, string>();
    const storage = {
        get length() {
            return store.size;
        },
        clear() {
            store = new Map();
        },
        getItem(key: string) {
            return store.has(String(key)) ? (store.get(String(key)) as string) : null;
        },
        key(index: number) {
            return [...store.keys()][index] ?? null;
        },
        removeItem(key: string) {
            store.delete(String(key));
        },
        setItem(key: string, value: string) {
            store.set(String(key), String(value));
        },
    };
    return storage as Storage;
};

const isBrokenStorage = (candidate: unknown): boolean => {
    if (!candidate) return true;
    const storage = candidate as Partial<Storage>;
    return (
        typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' ||
        typeof storage.removeItem !== 'function' ||
        typeof storage.clear !== 'function' ||
        typeof storage.key !== 'function'
    );
};

// Some suites run under `@vitest-environment node` (e.g. src/api/fetchData.test.ts),
// where `window` does not exist — patch via `globalThis` and only mirror onto
// `window` when a DOM environment provides one.
(['localStorage', 'sessionStorage'] as const).forEach((name) => {
    if (isBrokenStorage((globalThis as Record<string, unknown>)[name])) {
        const storage = createStorage();
        const targets: object[] = typeof window === 'undefined' ? [globalThis] : [globalThis, window];
        targets.forEach((target) => {
            Object.defineProperty(target, name, {
                configurable: true,
                value: storage,
                writable: true,
            });
        });
    }
});

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
