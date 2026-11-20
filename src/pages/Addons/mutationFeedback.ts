import type { TFunction } from 'i18next';
import { FETCH_ERRORS } from '../../api/fetchData';
import { snackbar } from '../../components/Snackbar';

const errorCode = (error: unknown) => (error instanceof Error ? error.message : '');

/**
 * Tells the admin that a change was not saved. A CATCH_ALL rejection already showed the transport's own
 * message, so it is not reported twice; a refused change says so instead of a generic failure.
 */
export const reportAddonSaveError = (error: unknown, t: TFunction, show: Pick<typeof snackbar, 'error'> = snackbar) => {
    const code = errorCode(error);
    if (code === FETCH_ERRORS.CATCH_ALL) {
        return;
    }
    show.error(String(t(code === FETCH_ERRORS.FORBIDDEN ? 'addons.error.saveForbidden' : 'addons.error.save')));
};
