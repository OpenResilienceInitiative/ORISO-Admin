import { FETCH_ERRORS, X_REASON } from '../api/fetchData';

/**
 * The refusals that are about the subdomain field, and the copy each one shows.
 * `SUBDOMAIN_INVALID` reuses the form's own pattern message: TenantService mirrors
 * `SUBDOMAIN_PATTERN`, so a second wording would be one rule in two sentences.
 */
const SUBDOMAIN_MESSAGE_KEYS: Record<string, string> = {
    [X_REASON.SUBDOMAIN_NOT_UNIQUE]: 'tenants.message.subdomainInUse',
    [X_REASON.SUBDOMAIN_INVALID]: 'tenants.add.form.subdomain.invalid',
};

interface TenantSaveErrorHandlerOptions {
    /** Translator, normally the `t` from the page's `useTranslation()`. */
    t: (key: string) => string;
    /** Puts the message on a form field, normally antd `form.setFields`. */
    setFieldError: (name: string, error: string) => void;
    /** Emits a page-level message, normally antd `notification.error`. */
    notifyError: (content: string) => void;
    /**
     * Whether the subdomain field is rendered at all. Under single-domain multitenancy it is not,
     * and an inline error would land on nothing.
     */
    canShowSubdomainError: boolean;
}

/**
 * Builds the `onError` handler for creating or updating a tenant. Outside the page for the same
 * reason as `createUserSaveErrorHandler`: rendering it costs more scaffold than the logic.
 *
 * A reason we have copy for is shown on its field; anything else falls through to the generic
 * message.
 */
export const createTenantSaveErrorHandler =
    ({ t, setFieldError, notifyError, canShowSubdomainError }: TenantSaveErrorHandlerOptions) =>
    (error: Error | Response): void => {
        const reason = error instanceof Error ? null : error?.headers?.get(FETCH_ERRORS.X_REASON);
        const messageKey = reason ? SUBDOMAIN_MESSAGE_KEYS[reason] : undefined;

        if (messageKey && canShowSubdomainError) {
            setFieldError('subdomain', t(messageKey));
            return;
        }

        notifyError(t(messageKey ?? 'message.error.default'));
    };
