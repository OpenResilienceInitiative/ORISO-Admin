import { useCallback, useEffect, useRef } from 'react';
import { getAccessTokenForRequests } from '../api/auth/auth';
import parseJwt from '../utils/parseJWT';

/** Async legal operations belong to one viewed tenant, account and publication. */
export const useDpaOperationScope = (tenantId: number | null, userId?: string, version?: string | null) => {
    const subject = parseJwt(getAccessTokenForRequests() ?? '')?.sub;
    const principal = typeof subject === 'string' ? subject : userId;
    const scopeRef = useRef({ tenantId, principal, version });
    if (
        scopeRef.current.tenantId !== tenantId ||
        scopeRef.current.principal !== principal ||
        scopeRef.current.version !== version
    ) {
        scopeRef.current = { tenantId, principal, version };
    }
    const scope = scopeRef.current;
    const active = useRef(true);
    useEffect(() => {
        active.current = true;
        return () => {
            active.current = false;
        };
    }, []);
    const isCurrent = useCallback(() => active.current && scopeRef.current === scope, [scope]);
    return { scope, isCurrent };
};
