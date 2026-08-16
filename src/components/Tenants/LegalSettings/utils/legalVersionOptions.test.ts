import { describe, it, expect } from 'vitest';
import { formatLegalVersionLabel, toEditorVersions } from './legalVersionOptions';

describe('formatLegalVersionLabel', () => {
    it('formats an ISO activation date in the given locale', () => {
        expect(formatLegalVersionLabel('2026-07-13T10:22:00Z', 'de')).toMatch(/2026/);
    });

    it('falls back to the raw value when the timestamp is not parseable', () => {
        expect(formatLegalVersionLabel('not-a-date', 'de')).toBe('not-a-date');
    });
});

describe('toEditorVersions', () => {
    const versions = [
        { activationDate: '2026-07-13T10:22:00Z', content: JSON.stringify({ de: '<p>neu</p>', en: '<p>new</p>' }) },
        { activationDate: '2026-05-02T09:00:00Z', content: JSON.stringify({ de: '<p>alt</p>' }) },
    ];

    it('shows the active language of every version', () => {
        const mapped = toEditorVersions(versions, 'de', 'de');
        expect(mapped.map((version) => version.content)).toEqual(['<p>neu</p>', '<p>alt</p>']);
        expect(mapped[0].id).toBe('2026-07-13T10:22:00Z');
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
        const mapped = toEditorVersions(
            [{ activationDate: '2026-01-01T00:00:00Z', content: '<p>legacy</p>' }],
            'de',
            'de',
        );
        expect(mapped[0].content).toBe('<p>legacy</p>');
    });
});
