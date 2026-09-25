import { describe, expect, it } from 'vitest';
import { counsellorInitials, normaliseAvatarValue, resolveAvatarKind } from './counsellorAvatar';

describe('counsellorInitials', () => {
    it('prefers the public display name over the real name', () => {
        expect(counsellorInitials({ displayName: 'Lena B.', firstname: 'Marie', lastname: 'Muster' })).toBe('LB');
    });

    it('falls back to first and last name', () => {
        expect(counsellorInitials({ firstname: 'Marie', lastname: 'Muster' })).toBe('MM');
    });

    it('falls back to the username as a last resort', () => {
        expect(counsellorInitials({ username: 'beraterin' })).toBe('B');
    });

    it('takes at most two letters', () => {
        expect(counsellorInitials({ displayName: 'Anna Maria Lena Beispiel' })).toBe('AM');
    });

    it('returns an empty string when nothing is known', () => {
        expect(counsellorInitials({ displayName: '   ' })).toBe('');
    });
});

describe('resolveAvatarKind', () => {
    it('paints the motif when one was chosen', () => {
        expect(resolveAvatarKind({ avatarKind: 'ICON', avatarId: 'fox' })).toBe('ICON');
    });

    it('degrades an ICON without a motif id to initials', () => {
        expect(resolveAvatarKind({ avatarKind: 'ICON', avatarId: '' })).toBe('INITIALS');
    });

    it('degrades the not-yet-built PICTURE kind to initials', () => {
        expect(resolveAvatarKind({ avatarKind: 'PICTURE', avatarId: 'file-1' })).toBe('INITIALS');
    });

    it('renders initials for a consultant who never chose', () => {
        expect(resolveAvatarKind({})).toBe('INITIALS');
    });
});

describe('normaliseAvatarValue', () => {
    it('clears a motif id behind an INITIALS choice (empty string, not null)', () => {
        // null would mean "leave the stored value untouched" to the backend.
        expect(normaliseAvatarValue({ avatarKind: 'INITIALS', avatarId: 'fox' })).toEqual({
            avatarKind: 'INITIALS',
            avatarId: '',
        });
    });

    it('keeps a chosen motif', () => {
        expect(normaliseAvatarValue({ avatarKind: 'ICON', avatarId: ' fox ' })).toEqual({
            avatarKind: 'ICON',
            avatarId: 'fox',
        });
    });

    it('turns an ICON without a motif into INITIALS rather than storing a half choice', () => {
        expect(normaliseAvatarValue({ avatarKind: 'ICON' })).toEqual({ avatarKind: 'INITIALS', avatarId: '' });
    });

    it('returns nothing for an unknown kind, so an untouched form writes no avatar', () => {
        expect(normaliseAvatarValue({ avatarKind: 'NOPE' as never })).toEqual({});
        expect(normaliseAvatarValue({})).toEqual({});
    });
});
