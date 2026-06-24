/**
 * Caritas legacy `dioceseId` is not used in ORISO SaaS but remains required by Agency/Topic APIs.
 * TODO: Remove once backend makes dioceseId optional (AD-M03 / AgencyService / TopicService).
 */
export const CARITAS_LEGACY_DIOCESE_ID = 0;

export type WithLegacyDioceseId<T> = T & { dioceseId: number };

export function withLegacyDioceseId<T extends Record<string, unknown>>(body: T): WithLegacyDioceseId<T> {
    return { ...body, dioceseId: CARITAS_LEGACY_DIOCESE_ID };
}
