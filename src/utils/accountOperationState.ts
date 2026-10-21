import type { AccountOperationIntent } from './accountOperationIdentity';

// Internal state shared by the intent/slot implementation. Never re-export
// these maps from the public accountOperationIntent module or persist them.
export const bindings = new WeakMap<AccountOperationIntent, string>();
export const children = new WeakMap<AccountOperationIntent, Map<string, AccountOperationIntent>>();
export const acknowledgements = new WeakMap<AccountOperationIntent, () => void>();

export const acknowledgeAccountOperation = (intent?: AccountOperationIntent) => {
    if (intent) acknowledgements.get(intent)?.();
};

/** Only observed response metadata can end a refused action. Error text cannot. */
export const isTerminalAccountOperationRefusal = (error: unknown): boolean => {
    let status: number | undefined;
    if (typeof Response !== 'undefined' && error instanceof Response) {
        status = error.status;
    } else if (error instanceof Error) {
        status = (error as Error & { status?: number }).status;
    }
    return status !== undefined && [400, 403, 412, 422].includes(status);
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
        if (isTerminalAccountOperationRefusal(error)) acknowledgeAccountOperation(intent);
        throw error;
    }
};
