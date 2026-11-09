import { describe, expect, it } from 'vitest';
import {
    copyDay,
    emptyWeek,
    formatOpeningHours,
    isRangeValid,
    isWeekCompatible,
    parseOpeningHours,
    serializeOpeningHours,
    slotsFromWeek,
    weekFromSlots,
    type OpeningHoursSlot,
} from './openingHours';

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

describe('weekday view round trip', () => {
    it('serialises a week to the stored payload and parses it back unchanged', () => {
        const week = emptyWeek();
        week.MONDAY = [
            { from: '08:00', until: '12:00' },
            { from: '13:00', until: '16:00' },
        ];
        week.WEDNESDAY = [{ from: '09:00', until: '17:00' }];
        const stored = serializeOpeningHours(slotsFromWeek(week));
        expect(JSON.parse(stored)).toEqual({
            version: 1,
            openingHours: [
                { fromDay: 'MONDAY', from: '08:00', untilDay: 'MONDAY', until: '12:00' },
                { fromDay: 'MONDAY', from: '13:00', untilDay: 'MONDAY', until: '16:00' },
                { fromDay: 'WEDNESDAY', from: '09:00', untilDay: 'WEDNESDAY', until: '17:00' },
            ],
        });
        expect(weekFromSlots(parseOpeningHours(stored).slots)).toEqual(week);
    });

    it('stores nothing for a fully closed week', () => {
        expect(serializeOpeningHours(slotsFromWeek(emptyWeek()))).toBe('');
    });

    it('keeps half-edited ranges out of the stored string', () => {
        const week = emptyWeek();
        week.FRIDAY = [
            { from: '10:00', until: '09:00' },
            { from: '', until: '12:00' },
        ];
        expect(slotsFromWeek(week)).toEqual([]);
        expect(isRangeValid({ from: '10:00', until: '09:00' })).toBe(false);
        expect(isRangeValid({ from: '09:00', until: '10:00' })).toBe(true);
    });

    it('detects slots that run past midnight as not week-compatible', () => {
        const { slots: overnight } = parseOpeningHours(
            JSON.stringify({
                version: 1,
                openingHours: [{ fromDay: 'MONDAY', from: '22:00', untilDay: 'TUESDAY', until: '02:00' }],
            }),
        );
        expect(isWeekCompatible(overnight)).toBe(false);
    });

    it('treats free text as legacy and not as slots', () => {
        expect(parseOpeningHours('Mo-Fr 9-17 Uhr')).toEqual({ slots: [], legacyText: 'Mo-Fr 9-17 Uhr' });
    });

    it('copies a day onto the target days only', () => {
        const week = emptyWeek();
        week.MONDAY = [{ from: '09:00', until: '12:00' }];
        const next = copyDay(week, 'MONDAY', ['MONDAY', 'TUESDAY', 'FRIDAY']);
        expect(next.TUESDAY).toEqual([{ from: '09:00', until: '12:00' }]);
        expect(next.FRIDAY).toEqual(next.MONDAY);
        expect(next.WEDNESDAY).toEqual([]);
        next.TUESDAY[0].from = '10:00';
        expect(next.MONDAY[0].from).toBe('09:00');
    });
});
