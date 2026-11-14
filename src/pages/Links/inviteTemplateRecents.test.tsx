import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { inviteTemplateRecentsKey, useInviteTemplateRecents } from './inviteTemplateRecents';

const identity = { issuer: 'https://auth.example.test/realm', subject: 'alice' };

describe('invite template recents', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('starts empty and remembers only the four latest explicit choices, moving a repeat first', () => {
        const { result, unmount } = renderHook(() => useInviteTemplateRecents(identity, 'TENANT_INVITE'));
        expect(result.current.ids).toEqual([]);
        [1, 2, 3, 4, 5, 3].forEach((id) => act(() => result.current.remember(id)));
        expect(result.current.ids).toEqual([3, 5, 4, 2]);
        unmount();
        const reloaded = renderHook(() => useInviteTemplateRecents(identity, 'TENANT_INVITE'));
        expect(reloaded.result.current.ids).toEqual([3, 5, 4, 2]);
    });

    it('isolates accounts and invite kinds immediately when the same view changes account', () => {
        const { result, rerender } = renderHook(
            ({ subject, kind }: { subject: string; kind: 'TENANT_INVITE' | 'COUNSELLOR_INVITE' }) =>
                useInviteTemplateRecents({ ...identity, subject }, kind),
            { initialProps: { subject: 'alice', kind: 'TENANT_INVITE' } },
        );
        act(() => result.current.remember(1));
        rerender({ subject: 'bob', kind: 'TENANT_INVITE' });
        expect(result.current.ids).toEqual([]);
        act(() => result.current.remember(2));
        rerender({ subject: 'alice', kind: 'COUNSELLOR_INVITE' });
        expect(result.current.ids).toEqual([]);
        rerender({ subject: 'alice', kind: 'TENANT_INVITE' });
        expect(result.current.ids).toEqual([1]);
    });

    it('normalizes malformed storage and isolates issuers as well as subjects', () => {
        localStorage.setItem(inviteTemplateRecentsKey(identity, 'TENANT_INVITE'), '[2,2,-1,"3",null,4]');
        const { result, rerender } = renderHook(
            ({ issuer }) => useInviteTemplateRecents({ ...identity, issuer }, 'TENANT_INVITE'),
            { initialProps: { issuer: identity.issuer } },
        );
        expect(result.current.ids).toEqual([2, 4]);
        rerender({ issuer: 'https://other-auth.example.test/realm' });
        expect(result.current.ids).toEqual([]);
    });

    it('keeps the mounted account usable when browser storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { result } = renderHook(() => useInviteTemplateRecents(identity, 'TENANT_INVITE'));
        act(() => result.current.remember(4));
        expect(result.current.ids).toEqual([4]);
    });

    it('does not share anonymous history between sessions', () => {
        const { result } = renderHook(() => useInviteTemplateRecents(undefined, 'TENANT_INVITE'));
        act(() => result.current.remember(1));
        expect(result.current.ids).toEqual([]);
        expect(localStorage.length).toBe(0);
    });
});
