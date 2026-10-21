import { AccountOperationIntent } from './accountOperationIdentity';
import { AccountOperationSlot, type AccountOperationAttempt } from './accountOperationSlot';
import { isTerminalAccountOperationRefusal } from './accountOperationState';

/** Owned by a mounted action/form, never by fetch or React Query retry. */
export class AccountOperationActions {
    private slots = new Map<string, AccountOperationSlot<unknown>>();

    edited(operation: string, target: string): void {
        // An intentional edit supersedes the previous form action. Its already
        // captured transport retry still owns its old immutable intent object.
        this.slots.delete(JSON.stringify([operation, target]));
    }

    private slotFor(operation: string, target: string) {
        const key = JSON.stringify([operation, target]);
        let slot = this.slots.get(key);
        if (!slot) {
            slot = new AccountOperationSlot();
            this.slots.set(key, slot);
        }
        return slot;
    }

    prepare<T>(
        operation: string,
        target: string,
        payload: T,
        materialize?: (payload: T) => T,
    ): AccountOperationAttempt<T> {
        const slot = this.slotFor(operation, target) as AccountOperationSlot<T>;
        return slot.prepare(operation, target, payload, materialize);
    }

    async run<T, R>(
        operation: string,
        target: string,
        payload: T,
        send: (payload: T, intent: AccountOperationIntent) => Promise<R>,
    ): Promise<R> {
        const slot = this.slotFor(operation, target);
        const attempt = slot.prepare(operation, target, payload);
        let result: R;
        try {
            result = await send(attempt.payload as T, attempt.intent);
        } catch (error) {
            if (isTerminalAccountOperationRefusal(error)) slot.acknowledge(attempt.intent);
            throw error;
        }
        // Finish before unrelated cache reloads, notifications or logout. A
        // failure in those steps does not make an acknowledged write unknown.
        slot.acknowledge(attempt.intent);
        return result;
    }
}
