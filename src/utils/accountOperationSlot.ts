import { AccountOperationIntent } from './accountOperationIdentity';
import { acknowledgements } from './accountOperationState';

export interface AccountOperationAttempt<T> {
    readonly intent: AccountOperationIntent;
    readonly payload: T;
}

const freezeSnapshot = <T>(value: T): T => {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(freezeSnapshot);
        Object.freeze(value);
    }
    return value;
};

export class AccountOperationSlot<T> {
    private current?: AccountOperationAttempt<T>;

    private fingerprint?: string;

    /** Call at the intentional action, before fetch or a retry callback. */
    prepare(
        operation: string,
        target: string,
        payload: T,
        materialize?: (payload: T) => T,
    ): AccountOperationAttempt<T> {
        const fingerprint = JSON.stringify([operation, target, payload]);
        if (!this.current || this.fingerprint !== fingerprint) {
            const submitted = JSON.parse(JSON.stringify(payload)) as T;
            const prepared = materialize ? materialize(submitted) : submitted;
            this.current = Object.freeze({
                intent: new AccountOperationIntent(),
                payload: freezeSnapshot(JSON.parse(JSON.stringify(prepared))),
            });
            const { intent } = this.current;
            acknowledgements.set(intent, () => this.acknowledge(intent));
            this.fingerprint = fingerprint;
        }
        return this.current;
    }

    /** A late response can only finish its own action, never a newer edit. */
    acknowledge(intent: AccountOperationIntent): void {
        if (this.current?.intent === intent) {
            this.current = undefined;
            this.fingerprint = undefined;
        }
    }
}
