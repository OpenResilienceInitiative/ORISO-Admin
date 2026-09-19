import { describe, expect, it, vi } from 'vitest';
import { createTenantSaveErrorHandler } from './tenantSaveErrorHandler';

/**
 * #1015. TenantService refuses a malformed subdomain with 400 + `X-Reason: SUBDOMAIN_INVALID`
 * and a duplicate one with 409 + `SUBDOMAIN_NOT_UNIQUE`. Both are about ONE field, and this
 * repo's CLAUDE.md is explicit that failure causes must be told apart at the UI: "rejected
 * because that name is taken" is a different instruction to the admin than "rejected because
 * that name cannot be a host name", and neither is "something went wrong".
 */
const rejection = (reason: string | null) =>
    ({ headers: { get: (name: string) => (name === 'X-Reason' ? reason : null) } } as unknown as Response);

const harness = (canShowSubdomainError = true) => {
    const setFieldError = vi.fn();
    const notifyError = vi.fn();
    const handle = createTenantSaveErrorHandler({
        t: (key: string) => key,
        setFieldError,
        notifyError,
        canShowSubdomainError,
    });
    return { handle, setFieldError, notifyError };
};

describe('createTenantSaveErrorHandler', () => {
    it('points the taken-subdomain refusal at the field that caused it', () => {
        const { handle, setFieldError, notifyError } = harness();

        handle(rejection('SUBDOMAIN_NOT_UNIQUE'));

        expect(setFieldError).toHaveBeenCalledWith('subdomain', 'tenants.message.subdomainInUse');
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('points the malformed-subdomain refusal at the same field, with the format rule', () => {
        // The server validates the pattern the form itself enforces (SubdomainValidator mirrors
        // SUBDOMAIN_PATTERN character for character), so it is shown with that rule's own
        // sentence rather than a second wording of the same rule.
        const { handle, setFieldError, notifyError } = harness();

        handle(rejection('SUBDOMAIN_INVALID'));

        expect(setFieldError).toHaveBeenCalledWith('subdomain', 'tenants.add.form.subdomain.invalid');
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('still names the cause when the subdomain field is not on screen', () => {
        // Under single-domain multitenancy the field is not rendered, so an inline error would
        // land on nothing at all — the admin would watch the save fail in silence.
        const { handle, setFieldError, notifyError } = harness(false);

        handle(rejection('SUBDOMAIN_INVALID'));

        expect(setFieldError).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalledWith('tenants.add.form.subdomain.invalid');
    });

    it('falls back to the generic message for a reason we have no copy for', () => {
        const { handle, setFieldError, notifyError } = harness();

        handle(rejection('SOMETHING_NEW'));

        expect(setFieldError).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalledWith('message.error.default');
    });

    it('falls back to the generic message for a transport error, which carries no headers', () => {
        const { handle, setFieldError, notifyError } = harness();

        handle(new Error('API call error: 500 Internal Server Error'));

        expect(setFieldError).not.toHaveBeenCalled();
        expect(notifyError).toHaveBeenCalledWith('message.error.default');
    });
});
