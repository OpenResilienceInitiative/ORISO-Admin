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
