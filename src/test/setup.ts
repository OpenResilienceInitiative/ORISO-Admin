import '@testing-library/jest-dom';

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

(['localStorage', 'sessionStorage'] as const).forEach((name) => {
    if (isBrokenStorage(window[name])) {
        const storage = createStorage();
        [window, globalThis].forEach((target) => {
            Object.defineProperty(target, name, {
                configurable: true,
                value: storage,
                writable: true,
            });
        });
    }
});
