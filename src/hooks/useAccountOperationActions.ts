import { useRef } from 'react';
import { accountOperationOwner } from '../utils/accountOperationOwner';
import { getSessionAccessToken } from '../api/auth/tokenSessionStore';
import { AccountOperationActions } from '../utils/accountOperationIntent';

/** The mounted form owns pending/unknown actions; nothing enters storage. */
export const useAccountOperationActions = () => {
    const actions = useRef<AccountOperationActions | null>(null);
    if (!actions.current)
        actions.current = new AccountOperationActions(() => accountOperationOwner(getSessionAccessToken()));
    return actions.current;
};
