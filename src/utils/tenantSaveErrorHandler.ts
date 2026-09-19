import { FETCH_ERRORS, X_REASON } from '../api/fetchData';

/**
 * The refusals that are about the subdomain field, and the copy each one shows.
 *
 * `SUBDOMAIN_INVALID` reuses the message the form's own pattern rule already shows:
 * TenantService's `SubdomainValidator` mirrors `SUBDOMAIN_PATTERN` character for character, so
 * a second wording of the same rule would be two sentences to keep in step for one rule.
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
     * Whether the subdomain field is rendered at all. Under single-domain multitenancy it is
     * not, and an inline error would then land on nothing — the save would appear to fail in
     * silence, which is the failure mode this handler exists to remove.
     */
    canShowSubdomainError: boolean;
}

/**
 * Builds the `onError` handler for creating or updating a tenant.
 *
 * Lives outside the page for the same reason as `createUserSaveErrorHandler`: reaching it
 * through a render of `GeneralTenantSettings` costs a mock scaffold larger than the logic.
 *
 * A reason we have copy for is shown on the field it belongs to. Anything else — an unknown
 * reason, or a transport error, which is not a `Response` and carries no headers at all —
 * falls through to the generic message.
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
