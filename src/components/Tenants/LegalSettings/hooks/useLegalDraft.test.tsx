import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLegalDraft } from './useLegalDraft';
import { legalDraftKey, readLegalDraft, writeLegalDraft } from '../utils/legalDraftStorage';

const successNotification = vi.fn();
const errorNotification = vi.fn();

vi.mock('antd', () => ({
    notification: {
        success: (...args: unknown[]) => successNotification(...args),
        error: (...args: unknown[]) => errorNotification(...args),
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
    window.localStorage.clear();
    successNotification.mockClear();
    errorNotification.mockClear();
    vi.restoreAllMocks();
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

    // ADR-021 decision 4: the consent sentence is part of the privacy policy, so it
    // is part of its draft. Storing only the body while reporting a successful save
    // lost the consent wording on the next reload.
    it('stores the consent sentence alongside the body', () => {
        const { result } = renderHook(() => useLegalDraft('privacy', '1:user-abc'));
        act(() =>
            result.current.saveDraft({ de: '<p>Richtlinie</p>' }, { de: 'Ich habe die {{legal_links}} gelesen.' }),
        );

        const stored = readLegalDraft(legalDraftKey('privacy', '1:user-abc'));
        expect(stored?.content).toEqual({ de: '<p>Richtlinie</p>' });
        expect(stored?.consent).toEqual({ de: 'Ich habe die {{legal_links}} gelesen.' });
    });

    it('reads back a draft written before the consent field existed', () => {
        writeLegalDraft(legalDraftKey('privacy', '1:user-abc'), { de: '<p>alt</p>' });
        const { result } = renderHook(() => useLegalDraft('privacy', '1:user-abc'));
        expect(result.current.draft?.content).toEqual({ de: '<p>alt</p>' });
        expect(result.current.draft?.consent).toBeUndefined();
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

    it('clears the stale warning once the draft is re-saved against the current version', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>alt</p>' }, '2026-08-01T09:00:00.000Z');
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc', '2026-08-10T09:00:00.000Z'));
        expect(result.current.isStale).toBe(true);

        act(() => result.current.saveDraft({ de: '<p>neu gegen die aktuelle Fassung</p>' }));

        expect(result.current.isStale).toBe(false);
        expect(readLegalDraft(legalDraftKey('dpa', '1:user-abc'))?.baseVersionId).toBe('2026-08-10T09:00:00.000Z');
    });

    it('reports a failed save instead of confirming it', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        act(() => result.current.saveDraft({ de: '<p>neu</p>' }));

        expect(errorNotification).toHaveBeenCalledTimes(1);
        expect(successNotification).not.toHaveBeenCalled();
        expect(result.current.savedAt).toBeUndefined();
    });

    it('keeps showing the draft when discarding it failed', () => {
        writeLegalDraft(legalDraftKey('dpa', '1:user-abc'), { de: '<p>bleibt</p>' });
        const { result } = renderHook(() => useLegalDraft('dpa', '1:user-abc'));
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('denied');
        });

        let discarded: boolean | undefined;
        act(() => {
            discarded = result.current.discardDraft();
        });

        expect(discarded).toBe(false);
        expect(errorNotification).toHaveBeenCalledTimes(1);
        expect(result.current.draft?.content).toEqual({ de: '<p>bleibt</p>' });
        expect(result.current.savedAt).toBeDefined();
    });

    it('is not stale when no version reference is known on either side', () => {
        writeLegalDraft(legalDraftKey('imprint', '1:user-abc'), { de: '<p>alt</p>' });
        const { result } = renderHook(() => useLegalDraft('imprint', '1:user-abc'));
        expect(result.current.isStale).toBe(false);
    });
});
