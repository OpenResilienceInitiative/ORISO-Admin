import { useRef } from 'react';
import { useAccountOperationActions } from './useAccountOperationActions';
import { useUserData } from './useUserData.hook';
import { getSessionAccessToken } from '../api/auth/tokenSessionStore';
import { accountOperationOwner } from '../utils/accountOperationOwner';
import { FETCH_ERRORS } from '../api/fetchData';
import {
    hasVerifiedAccountOperationRefusal,
    isTerminalAccountOperationRefusal,
    type AccountOperationIntent,
} from '../utils/accountOperationIntent';

/** An unresolved removal cannot change protocol or force flag during a retry. */
export const useIdentityRemovalCommand = (operation: string) => {
    const actions = useAccountOperationActions();
    const { data } = useUserData();
    const pending = useRef(new Map<string, { scoped: boolean; fingerprint: string }>());

    return async <T, R>(
        target: string,
        payload: T,
        send: (payload: T, intent?: AccountOperationIntent) => Promise<R>,
    ): Promise<R> => {
        const scoped = data?.scopedAccountCommands;
        if (scoped !== true && scoped !== false) throw new Error(FETCH_ERRORS.ACCOUNT_COMMANDS_UNAVAILABLE);
        const key = JSON.stringify([accountOperationOwner(getSessionAccessToken()), operation, target]);
        const fingerprint = JSON.stringify(payload);
        const original = pending.current.get(key);
        if (original && (original.scoped !== scoped || original.fingerprint !== fingerprint)) {
            throw new Error(FETCH_ERRORS.ACCOUNT_COMMANDS_UNAVAILABLE);
        }
        const custody = original ?? { scoped, fingerprint };
        pending.current.set(key, custody);
        const release = () => {
            if (pending.current.get(key) === custody) pending.current.delete(key);
        };
        try {
            const result = scoped ? await actions.run(operation, target, payload, send) : await send(payload);
            release();
            return result;
        } catch (error) {
            if (scoped ? hasVerifiedAccountOperationRefusal(error) : isTerminalAccountOperationRefusal(error))
                release();
            throw error;
        }
    };
};
