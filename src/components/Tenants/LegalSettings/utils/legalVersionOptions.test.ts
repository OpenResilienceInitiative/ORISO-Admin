import { describe, it, expect } from 'vitest';
import { LegalTextVersion } from '../../../../types/legalVersion';
import { formatLegalVersionLabel, toEditorVersions } from './legalVersionOptions';

const version = (id: number, publishedAt: string, content: string): LegalTextVersion => ({
    id,
    kind: 'DPP',
    ownerLevel: 'DEPARTMENT',
    ownerId: 3,
    publishedAt,
    content,
});

describe('formatLegalVersionLabel', () => {
    it('formats an ISO publication date in the given locale', () => {
        expect(formatLegalVersionLabel('2026-07-13T10:22:00Z', 'de')).toMatch(/2026/);
    });

    it('falls back to the raw value when the timestamp is not parseable', () => {
        expect(formatLegalVersionLabel('not-a-date', 'de')).toBe('not-a-date');
    });
});

describe('toEditorVersions', () => {
    const versions = [
        version(42, '2026-07-13T10:22:00Z', JSON.stringify({ de: '<p>neu</p>', en: '<p>new</p>' })),
        version(17, '2026-05-02T09:00:00Z', JSON.stringify({ de: '<p>alt</p>' })),
    ];

    it('shows the active language of every version', () => {
        const mapped = toEditorVersions(versions, 'de', 'de');
        expect(mapped.map((entry) => entry.content)).toEqual(['<p>neu</p>', '<p>alt</p>']);
    });

    it('keys an entry by the surrogate id and carries the date separately', () => {
        // ADR-021/#256: identity is the surrogate id, never the timestamp. The editor
        // formats its date ranges from `publishedAt`; reading a numeric id as a date
        // would turn version 42 into the year 2042.
        const mapped = toEditorVersions(versions, 'de', 'de');
        expect(mapped[0]).toMatchObject({ id: '42', publishedAt: '2026-07-13T10:22:00Z' });
        expect(mapped[1]).toMatchObject({ id: '17', publishedAt: '2026-05-02T09:00:00Z' });
    });

    it('falls back to the first stored language but forbids restoring it', () => {
        const mapped = toEditorVersions(versions, 'en', 'en');
        expect(mapped[0]).toMatchObject({ content: '<p>new</p>', restorable: true });
        // The older version was never stored in English — showing German is fine,
        // copying it into the English draft is not.
        expect(mapped[1]).toMatchObject({ content: '<p>alt</p>', restorable: false });
    });

    it('marks only the newest entry with the current suffix', () => {
        const mapped = toEditorVersions(versions, 'de', 'de', '(aktuell)');
        expect(mapped[0].label).toMatch(/\(aktuell\)$/);
        expect(mapped[1].label).not.toMatch(/\(aktuell\)$/);
    });

    it('tolerates legacy plain-HTML content', () => {
        const mapped = toEditorVersions([version(1, '2026-01-01T00:00:00Z', '<p>legacy</p>')], 'de', 'de');
        expect(mapped[0].content).toBe('<p>legacy</p>');
    });

    it('shows an empty page rather than crashing when a version carries no content', () => {
        // `content` is nullable in the #256 DTO.
        const mapped = toEditorVersions([{ ...version(1, '2026-01-01T00:00:00Z', ''), content: null }], 'de', 'de');
        expect(mapped[0].content).toBe('');
    });
});
