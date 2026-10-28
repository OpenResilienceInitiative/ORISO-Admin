import type { AccountOperationIntent } from './accountOperationIdentity';

// Internal state shared by the intent/slot implementation. Never re-export
// these maps from the public accountOperationIntent module or persist them.
export const bindings = new WeakMap<AccountOperationIntent, string>();
export const children = new WeakMap<AccountOperationIntent, Map<string, AccountOperationIntent>>();
export const acknowledgements = new WeakMap<AccountOperationIntent, () => void>();

type CompositeStepOutcome = 'unknown' | 'success' | 'refused';
const compositeSteps = new WeakMap<AccountOperationIntent, Map<AccountOperationIntent, CompositeStepOutcome>>();
const hasKnownCompositeOutcome = (parent: AccountOperationIntent | undefined): boolean => {
    const steps = parent ? compositeSteps.get(parent) : undefined;
    return !!steps?.size && [...steps.values()].every((outcome) => outcome !== 'unknown');
};
const compositeRefusals = new WeakMap<object, string>();

const uncertainIntents = new WeakSet<AccountOperationIntent>();
const uncertainErrors = new WeakSet<object>();
const verifiedRefusals = new WeakMap<object, string>();
const observedResponses = new WeakMap<object, { status: number; outcome: string | null; operation: string | null }>();

export const observedAccountOperationStatus = (error: unknown): number | undefined =>
    error !== null && (typeof error === 'object' || typeof error === 'function')
        ? observedResponses.get(error)?.status
        : undefined;

/** Only a transport reply matched to the settled scoped attempt can prove no effect. */
export const hasVerifiedAccountOperationRefusal = (error: unknown): boolean =>
    error !== null && (typeof error === 'object' || typeof error === 'function') && verifiedRefusals.has(error);

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
    if (object && intent && compositeRefusals.get(object) === intent.id) return true;
    let status: number | undefined;
    if (typeof Response !== 'undefined' && error instanceof Response) {
        status = error.status;
    } else if (error instanceof Error) {
        status = (error as Error & { status?: number }).status;
    }
    status = response?.status ?? status;
    const outcome = response?.outcome;
    const operation = response?.operation;
    if (
        object &&
        intent &&
        outcome === 'NO_EFFECT' &&
        operation === intent.id &&
        [400, 403, 409].includes(response?.status ?? 0)
    ) {
        verifiedRefusals.set(object, intent.id);
        uncertainErrors.delete(object);
        return true;
    }
    // A remote account attempt needs a matching committed receipt. HTTP
    // status alone cannot prove that an earlier native effect did not occur.
    if (intent) return false;
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
        // A partial save with every issued child settled is complete, but its
        // earlier successful child means the whole save was not NO_EFFECT.
        if (hasKnownCompositeOutcome(intent) || accountOperationFailed(intent, error)) {
            acknowledgeAccountOperation(intent);
        }
        throw error;
    }
};

/** Track each issued child, retaining the whole action while any result is unknown. */
export const settleAccountOperationStep = async <T>(
    parent: AccountOperationIntent | undefined,
    child: AccountOperationIntent | undefined,
    result: Promise<T>,
): Promise<T> => {
    let steps: Map<AccountOperationIntent, CompositeStepOutcome> | undefined;
    if (parent && child) {
        steps = compositeSteps.get(parent);
        if (!steps) {
            steps = new Map();
            compositeSteps.set(parent, steps);
        }
        if (!steps.has(child)) steps.set(child, 'unknown');
    }
    try {
        const response = await result;
        if (child) steps?.set(child, 'success');
        return response;
    } catch (error) {
        if (parent && child && steps && isTerminalAccountOperationRefusal(error, child)) {
            // A refusal during a later replay cannot erase an already observed
            // successful effect, nor finish a still-unknown sibling.
            if (steps.get(child) !== 'success') steps.set(child, 'refused');
            if (
                [...steps.values()].every((outcome) => outcome === 'refused') &&
                error !== null &&
                (typeof error === 'object' || typeof error === 'function')
            ) {
                compositeRefusals.set(error, parent.id);
            }
        }
        throw error;
    }
};
