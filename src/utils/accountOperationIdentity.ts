import { bindings, children } from './accountOperationState';

/** A correlation ID for one account action. It grants no authority. */
export class AccountOperationIntent {
    readonly id: string;

    constructor(id: string = crypto.randomUUID()) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
            throw new Error('Account intent must be a canonical UUID');
        }
        this.id = id;
        Object.freeze(this);
    }

    headersFor(method: string, target: string, body?: string) {
        const binding = JSON.stringify([method, target, body ?? null]);
        const previous = bindings.get(this);
        if (previous !== undefined && previous !== binding) {
            throw new Error('Intent already belongs to a different account operation');
        }
        bindings.set(this, binding);
        return { 'Idempotency-Key': this.id };
    }

    /** Separate effects of one save have separate, stable request IDs. */
    subIntent(name: string): AccountOperationIntent {
        let subIntents = children.get(this);
        if (!subIntents) {
            subIntents = new Map();
            children.set(this, subIntents);
        }
        let subIntent = subIntents.get(name);
        if (!subIntent) {
            subIntent = new AccountOperationIntent();
            subIntents.set(name, subIntent);
        }
        return subIntent;
    }
}

export const accountOperationHeaders = (
    intent: AccountOperationIntent | undefined,
    method: string,
    target: string,
    body?: string,
) => intent?.headersFor(method, target, body);
