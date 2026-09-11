import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { X_REASON } from '../api/fetchData';
import { resolveUserSaveErrorMessageKey } from './userSaveErrorMessageKey';

const allowed = { canReassignExistingEmail: true };
const notAllowed = { canReassignExistingEmail: false };

const localeKeys = (locale: string): Record<string, string> =>
    JSON.parse(readFileSync(resolve(__dirname, `../locales/${locale}/translation.json`), 'utf8'));

describe('resolveUserSaveErrorMessageKey', () => {
    it('names an unconfigured tenant licence, rather than falling back to the generic error', () => {
        expect(resolveUserSaveErrorMessageKey(X_REASON.TENANT_LICENSING_NOT_CONFIGURED, allowed)).toBe(
            'message.error.TENANT_LICENSING_NOT_CONFIGURED',
        );
    });

    it('keeps an exceeded licence distinct from a missing one', () => {
        expect(resolveUserSaveErrorMessageKey(X_REASON.NUMBER_OF_LICENSES_EXCEEDED, allowed)).toBe(
            'message.error.NUMBER_OF_LICENSES_EXCEEDED',
        );
        expect(resolveUserSaveErrorMessageKey(X_REASON.NUMBER_OF_LICENSES_EXCEEDED, allowed)).not.toBe(
            resolveUserSaveErrorMessageKey(X_REASON.TENANT_LICENSING_NOT_CONFIGURED, allowed),
        );
    });

    it.each([
        [X_REASON.USERNAME_NOT_AVAILABLE, 'message.error.USERNAME_NOT_AVAILABLE'],
        [X_REASON.PASSWORD_NOT_VALID, 'message.error.PASSWORD_NOT_VALID'],
    ])('maps %s to its own message', (reason, expected) => {
        expect(resolveUserSaveErrorMessageKey(reason, allowed)).toBe(expected);
    });

    it('varies the taken-email copy by whether the operator can clear the clash', () => {
        expect(resolveUserSaveErrorMessageKey(X_REASON.EMAIL_NOT_AVAILABLE, allowed)).toBe(
            'message.error.EMAIL_NOT_AVAILABLE',
        );
        expect(resolveUserSaveErrorMessageKey(X_REASON.EMAIL_NOT_AVAILABLE, notAllowed)).toBe(
            'notAllowed.message.error.EMAIL_NOT_AVAILABLE',
        );
    });

    it.each([['SOME_REASON_WE_DO_NOT_RENDER'], [null], [undefined], ['']])(
        'defers to the generic message for %s',
        (reason) => {
            expect(resolveUserSaveErrorMessageKey(reason, allowed)).toBeNull();
        },
    );

    it('resolves to a key that exists in every shipped locale', () => {
        const keys = [
            ...Object.values(X_REASON).map((reason) => resolveUserSaveErrorMessageKey(reason, allowed)),
            resolveUserSaveErrorMessageKey(X_REASON.EMAIL_NOT_AVAILABLE, notAllowed),
        ].filter((key): key is string => key !== null);

        expect(keys).toContain('message.error.TENANT_LICENSING_NOT_CONFIGURED');
        ['en', 'de'].forEach((locale) => {
            const translations = localeKeys(locale);
            keys.forEach((key) => expect(translations[key], `${key} missing in ${locale}`).toBeTruthy());
        });
    });
});
