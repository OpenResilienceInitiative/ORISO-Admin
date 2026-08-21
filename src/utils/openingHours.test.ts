import { describe, expect, it } from 'vitest';
import { formatOpeningHours, parseOpeningHours, serializeOpeningHours, type OpeningHoursSlot } from './openingHours';

const slots: OpeningHoursSlot[] = [
    { fromDay: 'MONDAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' },
    { fromDay: 'WEDNESDAY', from: '14:00', untilDay: 'WEDNESDAY', until: '16:00' },
];

describe('openingHours', () => {
    it('round-trips structured slots through the string field', () => {
        expect(parseOpeningHours(serializeOpeningHours(slots)).slots).toEqual(slots);
    });

    it('keeps legacy free text readable instead of discarding it', () => {
        const parsed = parseOpeningHours('Mo-Fr 9-17 Uhr, Termine nach Vereinbarung');

        expect(parsed.slots).toEqual([]);
        expect(parsed.legacyText).toBe('Mo-Fr 9-17 Uhr, Termine nach Vereinbarung');
    });

    it('treats an empty or missing value as no slots and no legacy text', () => {
        expect(parseOpeningHours(undefined)).toEqual({ slots: [], legacyText: '' });
        expect(parseOpeningHours('   ')).toEqual({ slots: [], legacyText: '' });
    });

    it('never crashes on malformed JSON — it falls back to legacy text', () => {
        const parsed = parseOpeningHours('{"openingHours": [broken');

        expect(parsed.slots).toEqual([]);
        expect(parsed.legacyText).toBe('{"openingHours": [broken');
    });

    it('drops entries that are not usable slots rather than rendering junk', () => {
        const payload = JSON.stringify({
            version: 1,
            openingHours: [
                { fromDay: 'MONDAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' },
                { fromDay: 'NOT_A_DAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' },
                { fromDay: 'FRIDAY', from: '25:00', untilDay: 'FRIDAY', until: '11:00' },
                { fromDay: 'FRIDAY', from: '09:00' },
            ],
        });

        expect(parseOpeningHours(payload).slots).toEqual([
            { fromDay: 'MONDAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' },
        ]);
    });

    it('serializes an empty list to an empty string so the field clears', () => {
        expect(serializeOpeningHours([])).toBe('');
    });

    const de = (key: string) =>
        ({ 'weekday.monday': 'Montag', 'weekday.tuesday': 'Dienstag', 'weekday.wednesday': 'Mittwoch' }[key] ?? key);

    it('formats slots for display, in input order', () => {
        expect(formatOpeningHours(slots, de)).toBe('Montag 10:00–11:00 · Mittwoch 14:00–16:00');
    });

    it('names the second weekday only when the slot crosses a day', () => {
        expect(
            formatOpeningHours([{ fromDay: 'MONDAY', from: '22:00', untilDay: 'TUESDAY', until: '02:00' }], de),
        ).toBe('Montag 22:00 – Dienstag 02:00');
    });
});
