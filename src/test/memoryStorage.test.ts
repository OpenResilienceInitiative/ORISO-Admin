// Guards the in-memory Web Storage in ./setup.ts. The contract under test is not
// "storage works" but "storage is SPY-ABLE": tests across the suite simulate a full
// or disabled storage with `vi.spyOn(Storage.prototype, 'setItem' | 'removeItem' |
// 'getItem')`, which only intercepts while the storage areas really inherit from that
// exact prototype object.
//
// Without this file, breaking that contract fails somewhere else entirely — a
// storage-backed feature quietly reports success where it must report failure — and
// the setup, the actual culprit, looks innocent.
//
// The trap is specific to this environment: `window === globalThis` under Vitest's
// jsdom, so Node's built-in web-storage globals share a namespace with jsdom's DOM
// globals. jsdom's `Storage` interface survives while Node's native `sessionStorage`
// instance survives with it — two objects that do not belong to each other. Installing
// only the area that happens to be missing therefore leaves one no spy can reach.
import { afterEach, describe, expect, it, vi } from 'vitest';

const areas = [
    ['localStorage', () => window.localStorage],
    ['sessionStorage', () => window.sessionStorage],
] as const;

describe('in-memory Web Storage', () => {
    // No storage cleanup here: ./setup.ts empties both areas after every test, and the
    // describe at the bottom of this file is what proves it.
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(areas)('%s', (_name, area) => {
        it('inherits from the global Storage the tests spy on', () => {
            expect(area()).toBeInstanceOf(Storage);
            expect(Object.getPrototypeOf(area())).toBe(Storage.prototype);
        });

        it.each(['clear', 'getItem', 'key', 'removeItem', 'setItem'] as const)(
            'resolves %s to the spy-able prototype rather than an own method',
            (method) => {
                expect(Object.hasOwn(area(), method)).toBe(false);
                expect(area()[method]).toBe(Storage.prototype[method]);
            },
        );

        it('round-trips values through the real implementation', () => {
            area().setItem('draft', '<p>Entwurf</p>');

            expect(area().getItem('draft')).toBe('<p>Entwurf</p>');
            expect(area().length).toBe(1);
            expect(area().key(0)).toBe('draft');

            area().removeItem('draft');

            expect(area().getItem('draft')).toBeNull();
            expect(area().key(0)).toBeNull();

            area().setItem('a', '1');
            area().clear();

            expect(area().length).toBe(0);
        });

        it('reports a miss as null rather than undefined', () => {
            expect(area().getItem('never-written')).toBeNull();
        });

        it('lets a Storage.prototype spy simulate a refused write', () => {
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            expect(() => area().setItem('draft', 'x')).toThrow('QuotaExceededError');
        });

        it('lets a Storage.prototype spy simulate a refused read — Safari private mode', () => {
            vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('SecurityError');
            });

            expect(() => area().getItem('draft')).toThrow('SecurityError');
        });

        it('lets a Storage.prototype spy simulate a refused removal', () => {
            vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
                throw new Error('SecurityError');
            });

            expect(() => area().removeItem('draft')).toThrow('SecurityError');
        });
    });

    it('keeps the two areas separate, so a session write is no local write', () => {
        window.localStorage.setItem('shared-key', 'local');
        window.sessionStorage.setItem('shared-key', 'session');

        expect(window.localStorage.getItem('shared-key')).toBe('local');
        expect(window.sessionStorage.getItem('shared-key')).toBe('session');

        window.localStorage.clear();

        expect(window.sessionStorage.getItem('shared-key')).toBe('session');
    });
});

// Like the antd notice cleanup next door, the leak this prevents is cross-test, so the
// assertions live in the test that FOLLOWS the one filling the storage. Nothing in this
// file may clean up storage by hand — that would mask the very leak under test.
describe('storage isolation between tests', () => {
    it('fills both areas without cleaning up after itself', () => {
        window.localStorage.setItem('leaked-key', 'local');
        window.sessionStorage.setItem('leaked-key', 'session');

        expect(window.localStorage.length).toBe(1);
        expect(window.sessionStorage.length).toBe(1);
    });

    it('starts with both areas empty, whatever the previous test wrote', () => {
        expect(window.localStorage.getItem('leaked-key')).toBeNull();
        expect(window.sessionStorage.getItem('leaked-key')).toBeNull();
        expect(window.localStorage.length).toBe(0);
        expect(window.sessionStorage.length).toBe(0);
    });
});
