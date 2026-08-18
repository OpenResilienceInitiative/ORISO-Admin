/**
 * In-memory Web Storage for the jsdom test environment.
 *
 * jsdom (v23) implements no usable Web Storage: `window.localStorage` is absent, and
 * the `sessionStorage` that is present comes from the host with a prototype of its own.
 * This module provides a minimal implementation so tests can read/write/clear without
 * each hand-rolling its own stub.
 *
 * The implementation goes ON `Storage.prototype`, NOT on a class of our own. Tests
 * simulate a full or disabled storage with `vi.spyOn(Storage.prototype, 'setItem' |
 * 'removeItem' | 'getItem')`; methods living on a separate class would shadow that
 * prototype, so the spy would patch an object nothing ever calls and the code under
 * test would quietly succeed where it is expected to report failure.
 *
 * See ./memoryStorage.test.ts for the contract this must keep.
 */

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

/** The areas this module owns, so they can be reset without going through a spy. */
const installedAreas: Storage[] = [];

export const installMemoryStorage = (): void => {
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

    installedAreas.length = 0;

    // Installed unconditionally, NOT only when the area is missing — presence does not
    // mean usable. Under Vitest's jsdom `window === globalThis`, so Node's built-in
    // web-storage globals share one namespace with jsdom's DOM globals: the surviving
    // `Storage` interface is jsdom's, while the surviving `sessionStorage` instance is
    // Node's native one, and the two do not belong to each other (`localStorage` is
    // absent only because Node needs --localstorage-file for it). A "polyfill what is
    // absent" guard would therefore leave `sessionStorage` as an object that no
    // `vi.spyOn(Storage.prototype, …)` can ever reach.
    (['localStorage', 'sessionStorage'] as const).forEach((name) => {
        // A real `Storage` instance, so `vi.spyOn(Storage.prototype, …)` intercepts.
        const area = Object.create(Storage.prototype) as Storage;
        installedAreas.push(area);
        Object.defineProperty(window, name, {
            configurable: true,
            writable: true,
            value: area,
        });
    });
};

/**
 * Empties both areas between tests so storage never leaks from one test into the next.
 *
 * Resets the backing maps directly instead of calling `clear()`: a test that leaves a
 * throwing `Storage.prototype` spy behind must not be able to break the cleanup of the
 * test after it.
 */
export const resetMemoryStorage = (): void => {
    installedAreas.forEach((area) => storeOf(area).clear());
};
