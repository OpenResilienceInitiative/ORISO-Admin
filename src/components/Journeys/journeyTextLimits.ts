import { plain } from './stepText';

/**
 * How long journey texts may be (Frank, 2026-11-20). The check-in shows one question per screen
 * without scrolling, so the words have to fit on a 390 px phone: a step title in two lines, the
 * line under it in four, a question in two, its help in three. These character counts are those
 * lines at the Frontend's type sizes; the Frontend cuts anything longer with "…"
 * (ORISO-Frontend#2417, `journeyTextLimits`). The editor warns while typing and marks the field
 * "zu lang" over the limit — it never cuts silently.
 */
export const TEXT_LIMITS = {
    stepTitle: 40,
    stepDescription: 160,
    question: 70,
    help: 130,
    option: 60,
} as const;

/** From this share of the limit on, the field says how much is left. */
const WARN_FROM = 0.85;

export type LengthState = { kind: 'ok' } | { kind: 'warn'; left: number } | { kind: 'over'; over: number };

/** Where a text stands against its limit, counted as the person will read it (without markup). */
export const lengthState = (text: string | undefined, limit: number): LengthState => {
    const { length } = plain(text ?? '');
    if (length > limit) return { kind: 'over', over: length - limit };
    if (length >= Math.ceil(limit * WARN_FROM)) return { kind: 'warn', left: limit - length };
    return { kind: 'ok' };
};
