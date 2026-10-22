import type { AccountOperationIntent } from './accountOperationIdentity';

// Internal state shared by the intent/slot implementation. Never re-export
// these maps from the public accountOperationIntent module or persist them.
export const bindings = new WeakMap<AccountOperationIntent, string>();
export const children = new WeakMap<AccountOperationIntent, Map<string, AccountOperationIntent>>();
export const acknowledgements = new WeakMap<AccountOperationIntent, () => void>();

const uncertainIntents = new WeakSet<AccountOperationIntent>();
const uncertainErrors = new WeakSet<object>();
const verifiedRefusals = new WeakMap<object, string>();
const observedResponses = new WeakMap<object, { status: number; outcome: string | null; operation: string | null }>();

// Internal transport evidence; arbitrary Error properties cannot create an acknowledgement.
export const recordAccountOperationResponse = (error: unknown, response: Response) => {
    if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
        observedResponses.set(error, {
            status: response.status,
            outcome: response.headers?.get('X-ORISO-Mutation-Outcome') ?? null,
            operation: response.headers?.get('X-ORISO-Mutation-Operation') ?? null,
        });
    }
};

export const acknowledgeAccountOperation = (intent?: AccountOperationIntent) => {
    if (intent) {
        uncertainIntents.delete(intent);
        acknowledgements.get(intent)?.();
    }
};

/** Only observed response metadata can end a refused action. Error text cannot. */
export const isTerminalAccountOperationRefusal = (error: unknown, intent?: AccountOperationIntent): boolean => {
    const object = error !== null && (typeof error === 'object' || typeof error === 'function') ? error : undefined;
    const response = object ? observedResponses.get(object) : undefined;
    let status: number | undefined;
    if (typeof Response !== 'undefined' && error instanceof Response) {
        status = error.status;
    } else if (error instanceof Error) {
        status = (error as Error & { status?: number }).status;
    }
    status = response?.status ?? status;
    const raw = typeof Response !== 'undefined' && error instanceof Response ? error : undefined;
    const outcome = response?.outcome ?? raw?.headers.get('X-ORISO-Mutation-Outcome');
    const operation = response?.operation ?? raw?.headers.get('X-ORISO-Mutation-Operation');
    if (
        object &&
        intent &&
        outcome === 'NO_EFFECT' &&
        operation === intent.id &&
        [400, 403, 409].includes(status ?? 0)
    ) {
        verifiedRefusals.set(object, intent.id);
        uncertainErrors.delete(object);
        return true;
    }
    if (intent && (outcome != null || operation != null)) return false;
    if (object && uncertainErrors.has(object)) return false;
    const verifiedOperation = object ? verifiedRefusals.get(object) : undefined;
    if (verifiedOperation !== undefined && (!intent || verifiedOperation === intent.id)) return true;
    if (intent && uncertainIntents.has(intent)) return false;
    return status !== undefined && [400, 403, 412, 422].includes(status);
};

export const accountOperationFailed = (intent: AccountOperationIntent | undefined, error: unknown): boolean => {
    const terminal = isTerminalAccountOperationRefusal(error, intent);
    if (!terminal && intent) {
        uncertainIntents.add(intent);
        if (error !== null && (typeof error === 'object' || typeof error === 'function')) uncertainErrors.add(error);
    }
    return terminal;
};

export const settleAccountOperation = async <T>(
    intent: AccountOperationIntent | undefined,
    result: Promise<T>,
): Promise<T> => {
    try {
        const response = await result;
        acknowledgeAccountOperation(intent);
        return response;
    } catch (error) {
        if (accountOperationFailed(intent, error)) acknowledgeAccountOperation(intent);
        throw error;
    }
};
