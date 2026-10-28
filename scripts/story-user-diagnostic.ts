/** Records dispatch ownership without changing request/response or verification policy. */
let route: { pathname: string; typeOfUsers?: string } | undefined;
export const observeUserDiagnosticRoute = (pathname: string, typeOfUsers?: string) => {
    if (!import.meta.env.VITE_ORISO_USER_SEQUENCE) return;
    if (route?.pathname === pathname && route?.typeOfUsers === typeOfUsers) return;
    route = { pathname, typeOfUsers };
    console.info(JSON.stringify({ userDiagnostic: 'route', ...route }));
};
export const beginUserDiagnostic = (caseName: string) => {
    const selection = import.meta.env.VITE_ORISO_USER_SEQUENCE;
    if (!selection) return () => {};
    if (!['tenant-alone', 'error-tenant-error', 'tenant-error-tenant'].includes(selection))
        throw new Error('Unknown user diagnostic sequence');
    route = undefined;
    const original = window.fetch;
    let consultants = 0;
    let tenantAdmins = 0;
    console.info(JSON.stringify({ userDiagnostic: 'begin', selection, caseName, at: performance.now() }));
    const observer: typeof window.fetch = (input, init) => {
        const request = input instanceof Request ? input : undefined;
        const url = new URL(request?.url ?? String(input), window.location.href);
        const owned =
            url.pathname === '/service/users/consultants/search' ||
            url.pathname === '/service/useradmin/tenantadmins/search';
        if (owned) {
            if (url.pathname === '/service/users/consultants/search') consultants += 1;
            else tenantAdmins += 1;
            if (consultants + tenantAdmins <= 20)
                console.info(
                    JSON.stringify({
                        userDiagnostic: 'dispatch',
                        caseName,
                        at: performance.now(),
                        route,
                        method: init?.method ?? request?.method ?? 'GET',
                        path: url.pathname,
                        query: url.search,
                        stack: new Error('User search dispatch origin').stack?.slice(0, 6000),
                    }),
                );
        }
        return original.call(window, input, init);
    };
    window.fetch = observer;
    return () => {
        const sinkStillOwned = window.fetch === observer;
        if (sinkStillOwned) window.fetch = original;
        console.info(
            JSON.stringify({
                userDiagnostic: 'end',
                caseName,
                at: performance.now(),
                route,
                consultants,
                tenantAdmins,
                sinkStillOwned,
            }),
        );
        if (!sinkStillOwned) throw new Error('User diagnostic fetch changed before cleanup');
        const tenantCase =
            selection === 'error-tenant-error' ? caseName === 'Case 2' : ['Case 1', 'Case 3'].includes(caseName);
        if (tenantCase && (consultants !== 0 || tenantAdmins < 1 || route?.typeOfUsers !== 'tenant-admins'))
            throw new Error('User diagnostic tenant route/request ownership invariant failed');
    };
};
