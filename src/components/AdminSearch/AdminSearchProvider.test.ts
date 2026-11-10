import { describe, expect, it } from 'vite-plus/test';
import { isSearchShortcut, isSlashShortcut } from './AdminSearchProvider';

const key = (init: Partial<KeyboardEvent> & { key: string }) =>
    ({
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        defaultPrevented: false,
        target: document.body,
        ...init,
    } as KeyboardEvent);

describe('search shortcuts', () => {
    it('opens with Ctrl+K and Cmd+K, not with a plain K or Alt+Ctrl+K', () => {
        expect(isSearchShortcut(key({ key: 'k', ctrlKey: true }))).toBe(true);
        expect(isSearchShortcut(key({ key: 'K', metaKey: true }))).toBe(true);
        expect(isSearchShortcut(key({ key: 'k' }))).toBe(false);
        expect(isSearchShortcut(key({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false);
    });

    // Found in review: Chrome fires a keydown without `key` when an autofill entry is picked.
    it('does not throw on a keydown without a key', () => {
        const autofill = { ...key({ key: 'k', ctrlKey: true }), key: undefined } as unknown as KeyboardEvent;

        expect(() => isSearchShortcut(autofill)).not.toThrow();
        expect(isSearchShortcut(autofill)).toBe(false);
        expect(isSlashShortcut(autofill)).toBe(false);
    });

    // Found in review: with reduced motion the open view closed at once, and the same key event then
    // reached the window listener, which opened it again.
    it('ignores Ctrl+K that the open view has already handled', () => {
        expect(isSearchShortcut(key({ key: 'k', ctrlKey: true, defaultPrevented: true }))).toBe(false);
    });

    it('opens with / unless the person is typing', () => {
        const input = document.createElement('input');
        const editable = document.createElement('div');

        Object.defineProperty(editable, 'isContentEditable', { value: true });

        expect(isSlashShortcut(key({ key: '/' }))).toBe(true);
        expect(isSlashShortcut(key({ key: '/', target: input }))).toBe(false);
        expect(isSlashShortcut(key({ key: '/', target: editable }))).toBe(false);
        expect(isSlashShortcut(key({ key: '/', ctrlKey: true }))).toBe(false);
        expect(isSlashShortcut(key({ key: '/', defaultPrevented: true }))).toBe(false);
    });
});
