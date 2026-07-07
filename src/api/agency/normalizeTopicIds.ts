/**
 * ADR-003: an agency maps to at most one topic (department = unique agency × topic), so the Admin
 * topic picker is single-select. Depending on the code path the topic value can arrive in several
 * shapes, and this normalises all of them to the `string[]` (length 0/1) the agency API expects:
 *
 * - a single labelInValue Option `{ value }` — the single-select form field
 * - a legacy array of Options `[{ value }]` — the former multi-select shape
 * - the backend topic shape `{ id }` / `[{ id }]`
 * - a raw id `string | number` or `string[]`
 * - `undefined` / `null` (field never set or cleared) → `[]`
 *
 * Non-numeric ids are dropped. The function is idempotent, so it is safe to run again on an
 * already-normalised `string[]`.
 */
type TopicLike = string | number | { value?: string | number; id?: string | number } | null | undefined;

const toArray = (value: TopicLike | TopicLike[]): TopicLike[] => {
    if (Array.isArray(value)) {
        return value;
    }
    return value == null ? [] : [value];
};

export const normalizeTopicIds = (value: TopicLike | TopicLike[]): string[] =>
    toArray(value)
        .map((item) => {
            if (item == null) {
                return null;
            }
            if (typeof item === 'string' || typeof item === 'number') {
                return item;
            }
            return item.value ?? item.id ?? null;
        })
        .filter((id): id is string | number => id != null && `${id}`.trim() !== '' && !Number.isNaN(Number(id)))
        .map((id) => String(id));
