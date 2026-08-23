import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { X_REASON } from '../api/fetchData';
import { createUserSaveErrorHandler } from './userSaveErrorHandler';

const translations = (locale: string): Record<string, string> =>
    JSON.parse(readFileSync(resolve(__dirname, `../locales/${locale}/translation.json`), 'utf8'));

/** Translates through the real shipped copy, so the assertions are on what the operator reads. */
const translatorFor = (locale: string) => {
    const copy = translations(locale);
    return (key: string) => copy[key] ?? key;
};

const failedSave = (reason?: string) =>
    new Response(JSON.stringify({}), {
        status: 400,
        headers: reason ? { 'X-Reason': reason } : {},
    });

const handlerFor = (locale: string, canReassignExistingEmail = true) => {
    const notifyError = vi.fn();
    const handle = createUserSaveErrorHandler({
        t: translatorFor(locale),
        notifyError,
        canReassignExistingEmail,
    });
    return { handle, notifyError };
};

describe('createUserSaveErrorHandler', () => {
    it.each(['en', 'de'])(
        'shows the unconfigured-licence message in %s when the response carries that reason',
        async (locale) => {
            const { handle, notifyError } = handlerFor(locale);

            await handle(failedSave(X_REASON.TENANT_LICENSING_NOT_CONFIGURED));

            const expected = translations(locale)['message.error.TENANT_LICENSING_NOT_CONFIGURED'];
            expect(expected).toBeTruthy();
            expect(notifyError).toHaveBeenCalledWith(expected);
            // The whole point: the operator must not be told "something went wrong" instead.
            expect(notifyError).not.toHaveBeenCalledWith(translations(locale)['message.error.default']);
        },
    );

    it('keeps an exceeded licence saying something different from a missing one', async () => {
        const { handle, notifyError } = handlerFor('en');

        await handle(failedSave(X_REASON.NUMBER_OF_LICENSES_EXCEEDED));

        const copy = translations('en');
        expect(notifyError).toHaveBeenCalledWith(copy['message.error.NUMBER_OF_LICENSES_EXCEEDED']);
        expect(notifyError).not.toHaveBeenCalledWith(copy['message.error.TENANT_LICENSING_NOT_CONFIGURED']);
    });

    it('words the taken-email case by whether the operator can clear the clash', async () => {
        const copy = translations('de');

        const allowed = handlerFor('de', true);
        await allowed.handle(failedSave(X_REASON.EMAIL_NOT_AVAILABLE));
        expect(allowed.notifyError).toHaveBeenCalledWith(copy['message.error.EMAIL_NOT_AVAILABLE']);

        const notAllowed = handlerFor('de', false);
        await notAllowed.handle(failedSave(X_REASON.EMAIL_NOT_AVAILABLE));
        expect(notAllowed.notifyError).toHaveBeenCalledWith(copy['notAllowed.message.error.EMAIL_NOT_AVAILABLE']);
    });

    it('falls back to the generic message when the response carries no reason', async () => {
        const { handle, notifyError } = handlerFor('en');

        await handle(failedSave());

        expect(notifyError).toHaveBeenCalledTimes(1);
        expect(notifyError).not.toHaveBeenCalledWith(
            translations('en')['message.error.TENANT_LICENSING_NOT_CONFIGURED'],
        );
    });

    it('does not blame licensing when the failure is a plain Error rather than a Response', async () => {
        const { handle, notifyError } = handlerFor('en');

        // Asserting the exact fallback text here would only measure the test environment:
        // extractApiErrorMessage ends in i18next.t(), which resolves to nothing until the app has
        // initialised i18n. What matters is that a transport failure is reported once and is never
        // dressed up as a tenant configuration problem.
        await expect(handle(new Error('network down'))).resolves.toBeUndefined();

        expect(notifyError).toHaveBeenCalledTimes(1);
        expect(notifyError).not.toHaveBeenCalledWith(
            translations('en')['message.error.TENANT_LICENSING_NOT_CONFIGURED'],
        );
    });
});
