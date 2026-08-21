/**
 * Structured opening hours on top of the existing `openingHours` string field
 * (decision 2026-08-19, "Option A"): the canonical payload is JSON stored in the
 * same string the API already carries, so no OpenAPI contract changes and the
 * fragile provider/consumer gates stay untouched.
 *
 * Anything that is not our payload is treated as LEGACY FREE TEXT and handed
 * back untouched — a Beratungsstelle that typed its hours by hand must never
 * lose them just because the editor changed.
 */

export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningHoursSlot {
    /** Figma 295-6112 puts a weekday on BOTH rows, so a slot may cross midnight. */
    fromDay: Weekday;
    /** 24h `HH:mm`, matching the native time input's value. */
    from: string;
    untilDay: Weekday;
    until: string;
}

export interface ParsedOpeningHours {
    slots: OpeningHoursSlot[];
    /** Non-empty only when the stored value was not our payload. */
    legacyText: string;
}

const PAYLOAD_VERSION = 1;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isWeekday = (value: unknown): value is Weekday => WEEKDAYS.includes(value as Weekday);

const isTime = (value: unknown): value is string => typeof value === 'string' && TIME_PATTERN.test(value);

const toSlot = (entry: unknown): OpeningHoursSlot | null => {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const { fromDay, from, untilDay, until } = entry as Record<string, unknown>;

    return isWeekday(fromDay) && isTime(from) && isWeekday(untilDay) && isTime(until)
        ? { fromDay, from, untilDay, until }
        : null;
};

/** `''` for an empty list so clearing every slot clears the stored field. */
export const serializeOpeningHours = (slots: OpeningHoursSlot[]): string =>
    slots.length === 0 ? '' : JSON.stringify({ version: PAYLOAD_VERSION, openingHours: slots });

export const parseOpeningHours = (value?: string | null): ParsedOpeningHours => {
    const raw = (value ?? '').trim();

    if (raw === '') {
        return { slots: [], legacyText: '' };
    }

    try {
        const parsed = JSON.parse(raw);
        const entries = (parsed as { openingHours?: unknown })?.openingHours;

        if (Array.isArray(entries)) {
            return {
                slots: entries.map(toSlot).filter((slot): slot is OpeningHoursSlot => slot !== null),
                legacyText: '',
            };
        }
    } catch {
        // Not our payload — fall through to the legacy branch below.
    }

    return { slots: [], legacyText: raw };
};

/** Human-readable one-liner, e.g. for the asker-facing card or a card summary. */
export const formatOpeningHours = (slots: OpeningHoursSlot[], t: (key: string) => string): string =>
    slots
        .map((slot) => {
            const fromLabel = t(`weekday.${slot.fromDay.toLowerCase()}`);
            // Only name the second weekday when the slot actually crosses a day.
            return slot.fromDay === slot.untilDay
                ? `${fromLabel} ${slot.from}–${slot.until}`
                : `${fromLabel} ${slot.from} – ${t(`weekday.${slot.untilDay.toLowerCase()}`)} ${slot.until}`;
        })
        .join(' · ');
