import { FETCH_ERRORS } from '../api/fetchData';
import { message } from 'antd';
import i18next from 'i18next';
import { tryRefreshAccessToken } from '../api/auth/auth';
import logout from '../api/auth/logout';
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
    options: { recoverOwnIdentity: boolean; renewOwnSuccess?: boolean },
): Promise<T> => {
    const token = getSessionAccessToken();
    const owner = accountOperationOwner(token);
    const ownMutation = options.recoverOwnIdentity && !!intent && parseJwt(token)?.sub === target;
    const attempt = () => settleAccountOperation(intent, send());
    let result: T;
    try {
        result = await attempt();
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
        result = await attempt();
    }
    if (ownMutation && options.renewOwnSuccess) {
        // The receipt already settled the mutation. Renew the removed role before
        // dependent reads; a failed renewal must never cause another DELETE.
        if (accountOperationOwner(getSessionAccessToken()) !== owner)
            throw new Error(FETCH_ERRORS.REQUEST_IDENTITY_CHANGED);
        const refreshed = await tryRefreshAccessToken({ afterInFlight: true });
        if (accountOperationOwner(getSessionAccessToken()) !== owner)
            throw new Error(FETCH_ERRORS.REQUEST_IDENTITY_CHANGED);
        if (!refreshed) {
            message.error({
                content: i18next.t('message.error.sessionExpired') as string,
                duration: 8,
                key: 'session-expired',
            });
            logout();
        }
    }
    return result;
};
