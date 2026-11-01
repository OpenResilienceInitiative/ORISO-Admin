import { useLayoutEffect, useRef, useState } from 'react';
import { uploadConsultantPicture } from '../api/counselor/consultantPicture';

interface CreationOperation {
    active: boolean;
    locked: boolean;
    consultantId?: string;
}

/** Owns the entire account + picture transaction, including the committed-account boundary. */
export const useCreateConsultantWithPicture = (routeKey: string) => {
    const operation = useRef<CreationOperation>({ active: true, locked: false });
    const accountRequests = useRef(new WeakSet<object>());
    const [busy, setBusy] = useState(false);

    useLayoutEffect(() => {
        const current: CreationOperation = { active: true, locked: false };
        operation.current = current;
        setBusy(false);
        return () => {
            current.active = false;
        };
    }, [routeKey]);

    const ownsAccountSuccess = (variables: object) => accountRequests.current.has(variables);
    const isLocked = () => operation.current.locked;
    const createWithPicture = async <Variables extends object>(
        create: (variables: Variables) => Promise<{ id: string }>,
        variables: Variables,
        file: File | null,
        onComplete: (id: string, pictureSaved: boolean) => void,
    ) => {
        const { current } = operation;
        if (!current.active || current.locked) return;
        current.locked = true;
        setBusy(true);
        try {
            // Keep the ID even if the view is left during POST. Never replay a committed account.
            // Mutation callbacks receive these exact variables, even when the observer changes
            // route. Remember ownership without suppressing another account's independent save.
            accountRequests.current.add(variables);
            current.consultantId ??= (await create(variables)).id;
        } catch {
            if (current.active) {
                current.locked = false;
                setBusy(false);
            }
            // The account mutation owns its error presentation.
            return;
        }
        if (!current.active) return;
        let pictureSaved = false;
        try {
            if (file) await uploadConsultantPicture(current.consultantId, file);
            pictureSaved = true;
        } catch {
            // The account exists: the only retry destination is its edit route.
        }
        if (current.active) onComplete(current.consultantId, pictureSaved);
        // Stay locked until navigation changes the route (or unmounts this owner).
    };

    return { busy, isLocked, ownsAccountSuccess, createWithPicture };
};
