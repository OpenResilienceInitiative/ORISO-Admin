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

    // jsdom (v23) implements no usable Web Storage: `window.localStorage` is absent,
    // and the `sessionStorage` that is present comes from the host with a prototype of
    // its own. Provide a minimal in-memory Storage so tests can read/write/clear
    // without each hand-rolling its own stub. Defined as configurable + writable so
    // tests that need a spy can still override it (`vi.stubGlobal('localStorage', …)`
    // or `Object.defineProperty`).
    //
    // The implementation goes ON `Storage.prototype` (jsdom ships the interface
    // object even though it ships no storage areas), NOT on a class of our own.
    // Tests simulate a full or disabled storage with
    // `vi.spyOn(Storage.prototype, 'setItem' | 'removeItem' | 'getItem')`; methods
    // living on a separate class would shadow that prototype, so the spy would
    // patch an object nothing ever calls and the code under test would quietly
    // succeed where it is expected to report failure.
    const memoryStores = new WeakMap<Storage, Map<string, string>>();
    const storeOf = (storage: Storage): Map<string, string> => {
        let store = memoryStores.get(storage);
        if (!store) {
            store = new Map<string, string>();
            memoryStores.set(storage, store);
        }
        return store;
    };

    const method = (value: (this: Storage, ...args: never[]) => unknown): PropertyDescriptor => ({
        configurable: true,
        writable: true,
        value,
    });

    Object.defineProperties(Storage.prototype, {
        length: {
            configurable: true,
            get(this: Storage): number {
                return storeOf(this).size;
            },
        },
        clear: method(function clear(this: Storage): void {
            storeOf(this).clear();
        }),
        getItem: method(function getItem(this: Storage, key: string): string | null {
            const store = storeOf(this);
            return store.has(key) ? (store.get(key) as string) : null;
        }),
        key: method(function key(this: Storage, index: number): string | null {
            return Array.from(storeOf(this).keys())[index] ?? null;
        }),
        removeItem: method(function removeItem(this: Storage, key: string): void {
            storeOf(this).delete(key);
        }),
        setItem: method(function setItem(this: Storage, key: string, value: string): void {
            storeOf(this).set(key, String(value));
        }),
    });

    // Installed unconditionally, NOT only when the area is missing. jsdom/Node hand
    // out a `sessionStorage` whose prototype is neither `Storage.prototype` nor
    // `window.Storage.prototype` but a third, unreachable object — so a
    // "polyfill only what is absent" guard would leave a storage area that no
    // `vi.spyOn(Storage.prototype, …)` can ever reach. Owning both areas also keeps
    // them symmetric and free of state carried in from the host.
    (['localStorage', 'sessionStorage'] as const).forEach((name) => {
        Object.defineProperty(window, name, {
            configurable: true,
            writable: true,
            // A real `Storage` instance, so `vi.spyOn(Storage.prototype, …)` intercepts.
            value: Object.create(Storage.prototype) as Storage,
        });
    });

    // jsdom does not implement scrolling; CardDeck calls scrollTo on its deck element.
    if (!Element.prototype.scrollTo) {
        Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
    }

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

// antd's static `message` / `notification` APIs render through a module-level
// singleton that portals notices into a container appended straight to document.body.
// RTL's cleanup() only unmounts what render() created, so a notice that has not
// auto-dismissed yet survives into the next test — a stale "This tenant ID is already
// taken." toast once broke an unrelated assertion in AccountInvitesTab.test.tsx on CI.
//
// destroy() alone does not fix it: it only queues a React update, so the notice is
// still in the DOM when the next test starts. act() flushes that update synchronously.
//
// Do NOT instead remove the .ant-message root from the body (the way stuck
// .ant-modal-root nodes are swept up): the singleton keeps rendering into the detached
// container, and every later notice in that file then silently never appears.
//
// Registered before the timer hook below so it runs last — Vitest runs afterEach in
// reverse registration order — and never has to flush against a test's fake clock.
//
// antd/react are imported lazily, only when a notice is actually on screen: a static
// import would pull antd into every test file, and an unconditional destroy() would
// instantiate the message holder in every single test.
afterEach(async () => {
    // `@vitest-environment node` files (e.g. api/fetchData.test.ts) have no DOM.
    if (typeof document === 'undefined' || !document.querySelector('.ant-message, .ant-notification')) {
        return;
    }

    const [{ message, notification }, { act }] = await Promise.all([import('antd'), import('react')]);

    act(() => {
        message.destroy();
        notification.destroy();
    });
});

// Prevent fake-timer leakage between test files when a test forgets to restore.
afterEach(() => {
    vi.useRealTimers();
});
