import { ownAccountOperation } from './accountOperationOwner';
import { AccountOperationIntent } from './accountOperationIdentity';
import { AccountOperationSlot, type AccountOperationAttempt } from './accountOperationSlot';
import { accountOperationFailed } from './accountOperationState';

/** Owned by a mounted action/form, never by fetch or React Query retry. */
export class AccountOperationActions {
    private slots = new Map<string, AccountOperationSlot<unknown>>();

    private owner?: string;

    private readonly readOwner?: () => string;

    constructor(readOwner?: () => string) {
        this.readOwner = readOwner;
    }

    // A returning person can resume their unknown action. Other people's
    // edits/acknowledgements never evict it; the mounted form owns this map.
    private currentOwner(): string | undefined {
        const owner = this.readOwner?.();
        if (owner !== this.owner) {
            this.owner = owner;
        }
        return owner;
    }

    edited(operation: string, target: string): void {
        // An intentional edit supersedes the previous form action. Its already
        // captured transport retry still owns its old immutable intent object.
        this.slots.delete(JSON.stringify([this.currentOwner(), operation, target]));
    }

    private slotFor(operation: string, target: string) {
        this.currentOwner();
        const key = JSON.stringify([this.owner, operation, target]);
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
        const attempt = slot.prepare(operation, target, payload, materialize);
        if (this.owner !== undefined) ownAccountOperation(attempt.intent, this.owner);
        return attempt;
    }

    async run<T, R>(
        operation: string,
        target: string,
        payload: T,
        send: (payload: T, intent: AccountOperationIntent) => Promise<R>,
    ): Promise<R> {
        const slot = this.slotFor(operation, target);
        const attempt = this.prepare(operation, target, payload);
        let result: R;
        try {
            result = await send(attempt.payload as T, attempt.intent);
        } catch (error) {
            if (accountOperationFailed(attempt.intent, error)) slot.acknowledge(attempt.intent);
            throw error;
        }
        // Finish before unrelated cache reloads, notifications or logout. A
        // failure in those steps does not make an acknowledged write unknown.
        slot.acknowledge(attempt.intent);
        return result;
    }
}
