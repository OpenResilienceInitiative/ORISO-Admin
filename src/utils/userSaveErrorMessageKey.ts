import { X_REASON } from '../api/fetchData';

/**
 * Maps the `X-Reason` header UserService returns on a failed consultant/admin save onto the i18n
 * key that names the failure.
 *
 * Extracted from the user add/edit page so the mapping can be asserted directly. Inlined in a
 * 600-line component it could only be reached by rendering the whole page behind a dozen mocks,
 * which in practice meant it was covered by a test that searched the source for string literals -
 * and that passes just as happily when the branch is unreachable.
 *
 * Returns `null` for a reason with no dedicated copy, which is the caller's signal to fall back to
 * the generic message derived from the response body.
 */
export const resolveUserSaveErrorMessageKey = (
    reason: string | null | undefined,
    { canReassignExistingEmail }: { canReassignExistingEmail: boolean },
): string | null => {
    switch (reason) {
        case X_REASON.EMAIL_NOT_AVAILABLE:
            // An operator allowed to delete consultants can clear the clash themselves; everyone
            // else has to be pointed at an admin, so the two cases read differently.
            return `${canReassignExistingEmail ? '' : 'notAllowed.'}message.error.${X_REASON.EMAIL_NOT_AVAILABLE}`;
        case X_REASON.USERNAME_NOT_AVAILABLE:
        case X_REASON.NUMBER_OF_LICENSES_EXCEEDED:
        case X_REASON.TENANT_LICENSING_NOT_CONFIGURED:
        case X_REASON.PASSWORD_NOT_VALID:
            return `message.error.${reason}`;
        default:
            return null;
    }
};
