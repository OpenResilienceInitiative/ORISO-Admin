/**
 * Parses a HAL+JSON response from the backend.
 * Returns null for 204 No Content, non-JSON, or empty body.
 * Returns the parsed JSON object otherwise.
 * Pass-through for non-Response values (e.g. pre-parsed objects from fetchData).
 */
export const parseHalResponse = async (response: unknown): Promise<unknown> => {
    if (!(response instanceof Response)) {
        return response;
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    // Backend returns HAL responses (application/hal+json) — match any JSON content type.
    if (!contentType.includes('json')) {
        return null;
    }

    const rawBody = await response.clone().text();
    if (!rawBody.trim()) {
        return null;
    }

    return JSON.parse(rawBody);
};
