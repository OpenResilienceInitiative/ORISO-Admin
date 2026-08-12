import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLegalDraft, legalDraftKey, readLegalDraft, writeLegalDraft } from './legalDraftStorage';

const key = legalDraftKey('dpa', '1:user-abc');

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('legalDraftKey', () => {
    it('namespaces by document and scope', () => {
        expect(legalDraftKey('dpa', '1:user-abc')).toBe('oriso-admin.legal.draft.dpa.1:user-abc');
        expect(legalDraftKey('imprint', '2:user-xyz')).toBe('oriso-admin.legal.draft.imprint.2:user-xyz');
    });
});

describe('readLegalDraft', () => {
    it('returns undefined when nothing was stored', () => {
        expect(readLegalDraft(key)).toBeUndefined();
    });

    it('returns undefined for an unreadable key', () => {
        expect(readLegalDraft(undefined)).toBeUndefined();
    });

    it('ignores malformed JSON instead of throwing', () => {
        window.localStorage.setItem(key, 'not json');
        expect(readLegalDraft(key)).toBeUndefined();
    });

    it('ignores a stored value whose shape is not a draft', () => {
        window.localStorage.setItem(key, JSON.stringify({ content: 'a string', savedAt: '2026-08-12T10:00:00.000Z' }));
        expect(readLegalDraft(key)).toBeUndefined();
    });

    it('drops non-string content entries rather than feeding them to the editor', () => {
        window.localStorage.setItem(
            key,
            JSON.stringify({ content: { de: '<p>ok</p>', en: 42 }, savedAt: '2026-08-12T10:00:00.000Z' }),
        );
        expect(readLegalDraft(key)?.content).toEqual({ de: '<p>ok</p>' });
    });

    it('survives a localStorage that throws (private mode)', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        expect(readLegalDraft(key)).toBeUndefined();
    });
});

describe('writeLegalDraft', () => {
    it('round-trips content, timestamp and the base version', () => {
        writeLegalDraft(key, { de: '<p>Entwurf</p>' }, '2026-08-01T09:00:00.000Z');
        const draft = readLegalDraft(key);
        expect(draft?.content).toEqual({ de: '<p>Entwurf</p>' });
        expect(draft?.baseVersionId).toBe('2026-08-01T09:00:00.000Z');
        expect(Number.isNaN(Date.parse(draft!.savedAt))).toBe(false);
    });

    it('does nothing without a key, so an unknown user never writes a shared draft', () => {
        writeLegalDraft(undefined, { de: '<p>Entwurf</p>' });
        expect(window.localStorage.length).toBe(0);
    });

    it('survives a full or disabled storage', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        expect(() => writeLegalDraft(key, { de: '<p>Entwurf</p>' })).not.toThrow();
    });
});

describe('clearLegalDraft', () => {
    it('removes a stored draft', () => {
        writeLegalDraft(key, { de: '<p>Entwurf</p>' });
        clearLegalDraft(key);
        expect(readLegalDraft(key)).toBeUndefined();
    });

    it('survives a storage that throws', () => {
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('denied');
        });
        expect(() => clearLegalDraft(key)).not.toThrow();
    });
});
