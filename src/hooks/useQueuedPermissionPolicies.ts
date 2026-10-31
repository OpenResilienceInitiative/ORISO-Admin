import { useCallback, useEffect, useRef, useState } from 'react';
import type { PolicyValue } from '../types/permissionPolicy';

type Policies = Record<string, PolicyValue<boolean>>;
type Operation = { id: number; field: string; policy: PolicyValue<boolean> };

/** Rebase each field write onto confirmed server state; a failed sibling is never replayed. */
export const useQueuedPermissionPolicies = (
    resourceKey: string,
    confirmed: Policies | undefined,
    save: (field: string, policy: PolicyValue<boolean>) => Promise<Policies>,
) => {
    const activeResource = useRef(resourceKey);
    const generation = useRef(0);
    const base = useRef(confirmed);
    const operations = useRef<Operation[]>([]);
    const nextId = useRef(0);
    const queue = useRef<Promise<void>>(Promise.resolve());
    const [policies, setPolicies] = useState(confirmed);
    const [pendingFields, setPendingFields] = useState<ReadonlySet<string>>(new Set());

    const rebuild = useCallback(() => {
        if (!base.current) return;
        setPolicies(
            operations.current.reduce((values, operation) => ({ ...values, [operation.field]: operation.policy }), {
                ...base.current,
            }),
        );
        setPendingFields(new Set(operations.current.map(({ field }) => field)));
    }, []);

    useEffect(() => {
        generation.current += 1;
        activeResource.current = resourceKey;
        base.current = confirmed;
        operations.current = [];
        queue.current = Promise.resolve();
        setPolicies(confirmed);
        setPendingFields(new Set());
        return () => {
            generation.current += 1;
        };
    }, [resourceKey]);

    useEffect(() => {
        if (operations.current.length === 0) {
            base.current = confirmed;
            setPolicies(confirmed);
        }
    }, [confirmed]);

    const changePolicy = useCallback(
        (field: string, policy: PolicyValue<boolean>) => {
            if (!base.current || activeResource.current !== resourceKey) return;
            const operation = { id: nextId.current, field, policy };
            nextId.current += 1;
            const operationGeneration = generation.current;
            operations.current.push(operation);
            rebuild();
            const run = async () => {
                if (activeResource.current !== resourceKey || generation.current !== operationGeneration) return;
                try {
                    const saved = await save(field, policy);
                    if (activeResource.current === resourceKey && generation.current === operationGeneration)
                        base.current = saved;
                } catch {
                    // The owning mutation reports the failed write; only this field rolls back.
                } finally {
                    if (activeResource.current === resourceKey && generation.current === operationGeneration) {
                        operations.current = operations.current.filter(({ id }) => id !== operation.id);
                        rebuild();
                    }
                }
            };
            queue.current = queue.current.then(run, run);
        },
        [rebuild, resourceKey, save],
    );

    return { policies: activeResource.current === resourceKey ? policies : undefined, pendingFields, changePolicy };
};
