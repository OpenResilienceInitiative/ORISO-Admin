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
    afterEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.sessionStorage.clear();
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
