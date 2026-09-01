import i18next from 'i18next';
import { FETCH_ERRORS, X_REASON } from '../api/fetchData';

const X_REASON_KEYS = new Set<string>(Object.values(X_REASON));

const extractReasonFromBody = (body: unknown): string | null => {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const record = body as Record<string, unknown>;
    if (typeof record.reason === 'string') {
        return record.reason;
    }
    if (typeof record.xReason === 'string') {
        return record.xReason;
    }

    return null;
};

export const extractApiErrorReason = async (error: unknown): Promise<string | null> => {
    if (!(error instanceof Response)) {
        return null;
    }

    const headerReason = error.headers.get(FETCH_ERRORS.X_REASON);
    if (headerReason) {
        return headerReason;
    }

    try {
        return extractReasonFromBody(await error.clone().json());
    } catch {
        return null;
    }
};

const translateXReason = (reason: string | null): string | null => {
    if (!reason || !X_REASON_KEYS.has(reason)) {
        return null;
    }
    const key = `message.error.${reason}`;
    const translated = i18next.t(key);
    return translated !== key ? translated : null;
};

const extractFromBody = (body: unknown): string | null => {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const record = body as Record<string, unknown>;
    const bodyReason = extractReasonFromBody(body);
    const translatedBodyReason = translateXReason(bodyReason);
    if (translatedBodyReason) {
        return translatedBodyReason;
    }

    if (typeof record.message === 'string' && record.message.trim()) {
        const translatedMessageReason = translateXReason(record.message.trim());
        if (translatedMessageReason) {
            return translatedMessageReason;
        }
        return record.message.trim();
    }

    if (typeof record.error === 'string' && record.error.trim()) {
        const translatedErrorReason = translateXReason(record.error.trim());
        if (translatedErrorReason) {
            return translatedErrorReason;
        }
        return record.error.trim();
    }

    if (record.errors && typeof record.errors === 'object') {
        const errors = record.errors as Record<string, unknown>;
        const firstError = Object.values(errors).find((value) => typeof value === 'string' && value.trim());
        if (typeof firstError === 'string') {
            return firstError.trim();
        }
    }

    return null;
};

/**
 * Like {@link extractApiErrorMessage}, but returns `null` when the response carries no
 * usable message — for callers that supply their own (react-i18next translated)
 * fallback text instead of the global i18next key lookup.
 */
export const extractApiErrorMessageOrNull = async (error: unknown): Promise<string | null> => {
    if (error instanceof Response) {
        const xReason = translateXReason(await extractApiErrorReason(error));
        if (xReason) {
            return xReason;
        }

        try {
            const body = await error.clone().json();
            const bodyMessage = extractFromBody(body);
            if (bodyMessage) {
                return bodyMessage;
            }
        } catch {
            // fall through to fallback
        }
    }

    if (error instanceof Error && error.message && error.message !== FETCH_ERRORS.CATCH_ALL) {
        const xReason = translateXReason(error.message);
        if (xReason) {
            return xReason;
        }
    }

    return null;
};

export const extractApiErrorMessage = async (error: unknown, fallbackKey = 'message.error.default'): Promise<string> =>
    (await extractApiErrorMessageOrNull(error)) ?? i18next.t(fallbackKey);

export const showApiErrorMessage = async (
    error: unknown,
    notify: (message: string) => void,
    fallbackKey = 'message.error.default',
) => {
    const message = await extractApiErrorMessage(error, fallbackKey);
    notify(message);
};
