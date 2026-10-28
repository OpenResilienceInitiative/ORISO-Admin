import { FETCH_ERRORS } from '../api/fetchData';
import { tryRefreshAccessToken } from '../api/auth/auth';
import { getSessionAccessToken } from '../api/auth/tokenSessionStore';
import parseJwt from './parseJWT';
import { accountOperationOwner } from './accountOperationOwner';
import type { AccountOperationIntent } from './accountOperationIdentity';
import {
    hasVerifiedAccountOperationRefusal,
    observedAccountOperationStatus,
    settleAccountOperation,
} from './accountOperationState';

/** Own Consultant identity changes can commit before the role-changing reply is lost. */
export const settleOwnConsultantIdentityMutation = async <T>(
    target: string,
    intent: AccountOperationIntent | undefined,
    send: () => Promise<T>,
    recoverOwnIdentity: boolean,
): Promise<T> => {
    const token = getSessionAccessToken();
    const owner = accountOperationOwner(token);
    const ownMutation = recoverOwnIdentity && !!intent && parseJwt(token)?.sub === target;
    const attempt = () => settleAccountOperation(intent, send());
    try {
        return await attempt();
    } catch (error) {
        if (
            !ownMutation ||
            hasVerifiedAccountOperationRefusal(error) ||
            ![403, 503].includes(observedAccountOperationStatus(error) ?? 0)
        )
            throw error;
        // Refresh once as the same person and replay the original request.
        // Observing the changed roles is not a replacement for its receipt.
        if (!(await tryRefreshAccessToken())) throw error;
        if (accountOperationOwner(getSessionAccessToken()) !== owner)
            throw new Error(FETCH_ERRORS.REQUEST_IDENTITY_CHANGED);
        return attempt();
    }
};
