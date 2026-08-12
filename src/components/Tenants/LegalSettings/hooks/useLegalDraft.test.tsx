import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLegalDraft } from './useLegalDraft';
import { legalDraftKey, readLegalDraft, writeLegalDraft } from '../utils/legalDraftStorage';

const successNotification = vi.fn();

vi.mock('antd', () => ({
    notification: {
        success: (...args: unknown[]) => successNotification(...args),
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
    window.localStorage.clear();
    successNotification.mockClear();
});

describe('useLegalDraft', () => {
    it('has no draft when nothing was stored', () => {
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        expect(result.current.draft).toBeUndefined();
        expect(result.current.savedAt).toBeUndefined();
        expect(result.current.isStale).toBe(false);
    });

    it('loads a stored draft for the scope', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>gespeichert</p>' });
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        expect(result.current.draft?.content).toEqual({ de: '<p>gespeichert</p>' });
        expect(result.current.savedAt).toBe(result.current.draft?.savedAt);
    });

    it('does not read another user’s or another tenant’s draft', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>fremd</p>' });
        expect(renderHook(() => useLegalDraft('dpa', '1:user-xyz')).result.current.draft).toBeUndefined();
        expect(renderHook(() => useLegalDraft('dpa', '2:user-abc')).result.current.draft).toBeUndefined();
        expect(renderHook(() => useLegalDraft('imprint', '1:user-abc')).result.current.draft).toBeUndefined();
    });

    it('picks the draft up once the user id arrives late', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>spät</p>' });
        const { result, rerender } = renderHook(({ scope }: { scope?: string }) => useLegalDraft('dpa', scope), {
            initialProps: { scope: undefined as string | undefined },
        });
        expect(result.current.draft).toBeUndefined();
        rerender({ scope: '1:user-abc' });
        expect(result.current.draft?.content).toEqual({ de: '<p>spät</p>' });
    });

    it('stores the content map and confirms the save to the admin', () => {
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc', '2026-08-01T09:00:00.000Z'));
        act(() => result.current.saveDraft({ de: '<p>neu</p>', en: '<p>new</p>' }));

        const stored = readLegalDraft(legalDraftKey('dpa', '1:user-abc'));
        expect(stored?.content).toEqual({ de: '<p>neu</p>', en: '<p>new</p>' });
        expect(stored?.baseVersionId).toBe('2026-08-01T09:00:00.000Z');
        expect(successNotification).toHaveBeenCalledTimes(1);
        expect(result.current.savedAt).toBe(stored?.savedAt);
    });

    it('keeps the loaded draft stable across a save, so the editor is never remounted mid-edit', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>alt</p>' });
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        const loaded = result.current.draft;
        act(() => result.current.saveDraft({ de: '<p>neu</p>' }));
        expect(result.current.draft).toBe(loaded);
    });

    it('writes nothing while the user id is unknown', () => {
        const { result } = renderHook(() => useLegalDraft('dpa', undefined));
        act(() => result.current.saveDraft({ de: '<p>neu</p>' }));
        expect(window.localStorage.length).toBe(0);
        expect(successNotification).not.toHaveBeenCalled();
    });

    it('discarding removes the draft and drops it from the hook', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>weg</p>' });
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        act(() => result.current.discardDraft());
        expect(readLegalDraft(legalDraftKey('dpa', '1:user-abc'))).toBeUndefined();
        expect(result.current.draft).toBeUndefined();
        expect(result.current.savedAt).toBeUndefined();
    });

    it('flags a draft as stale when a newer version was published since it was saved', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>alt</p>' }, '2026-08-01T09:00:00.000Z');
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc', '2026-08-10T09:00:00.000Z'));
        expect(result.current.isStale).toBe(true);
    });

    it('is not stale against the version it was written on', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>alt</p>' }, '2026-08-01T09:00:00.000Z');
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc', '2026-08-01T09:00:00.000Z'));
        expect(result.current.isStale).toBe(false);
    });

    it('is not stale when no version reference is known on either side', () => {
        writeLegalDraft(legalDraftKey('imprint', '1:user-abc'), { de: '<p>alt</p>' });
        const { result } = renderHook(() => useLegalDraft('imprint', '1:user-abc'));
        expect(result.current.isStale).toBe(false);
    });
});
