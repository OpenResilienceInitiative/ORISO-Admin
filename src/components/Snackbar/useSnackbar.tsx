import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SnackbarHost } from './SnackbarHost';
import { createSnackbarApi, snackbar, snackbarStore, type SnackbarApi, type SnackbarStore } from './snackbarStore';

const SnackbarContext = createContext<SnackbarApi>(snackbar);

/**
 * Mount once at the root: renders the host and, in stories or tests, binds `useSnackbar()` to a
 * private store. In the app it is the one global store, which `fetchData` and the hooks also use.
 */
export const SnackbarProvider = ({
    children,
    store = snackbarStore,
    container,
    contained,
}: {
    children?: ReactNode;
    store?: SnackbarStore;
    container?: HTMLElement | null;
    contained?: boolean;
}) => {
    const api = useMemo(() => (store === snackbarStore ? snackbar : createSnackbarApi(store)), [store]);
    return (
        <SnackbarContext.Provider value={api}>
            {children}
            <SnackbarHost store={store} container={container} contained={contained} />
        </SnackbarContext.Provider>
    );
};

/**
 * `const { notify, success, error } = useSnackbar();`
 * Works without a provider too (it falls back to the global channel), so a component can raise a
 * message in a unit test without extra setup.
 */
export const useSnackbar = (): SnackbarApi => useContext(SnackbarContext);
