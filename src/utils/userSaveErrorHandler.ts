import { FETCH_ERRORS } from '../api/fetchData';
import { extractApiErrorMessage } from './extractApiErrorMessage';
import { resolveUserSaveErrorMessageKey } from './userSaveErrorMessageKey';

interface UserSaveErrorHandlerOptions {
    /** Translator, normally the `t` from the page's `useTranslation()`. */
    t: (key: string) => string;
    /** Emits the finished message, normally antd `message.error`. */
    notifyError: (content: string) => void;
    /**
     * Whether the operator may clear an existing account themselves, which decides how the
     * taken-email case is worded.
     */
    canReassignExistingEmail: boolean;
}

/**
 * Builds the `onError` handler for saving a consultant or agency admin.
 *
 * Lives outside the page so the behaviour can actually be tested. `UserEditOrAdd` is 600 lines
 * behind roughly twenty hooks, so reaching this logic through a render means a mock scaffold larger
 * than the thing under test - which is how it ended up covered by a test that searched the source
 * for string literals and proved nothing about what the operator sees.
 *
 * A reason we have copy for is shown as-is. Anything else falls through to the message derived from
 * the response body, which is where the generic "something went wrong" comes from.
 */
export const createUserSaveErrorHandler =
    ({ t, notifyError, canReassignExistingEmail }: UserSaveErrorHandlerOptions) =>
    async (error: Error | Response): Promise<void> => {
        if (error instanceof Response) {
            const messageKey = resolveUserSaveErrorMessageKey(error.headers.get(FETCH_ERRORS.X_REASON), {
                canReassignExistingEmail,
            });
            if (messageKey) {
                notifyError(t(messageKey));
                return;
            }
        }

        notifyError(await extractApiErrorMessage(error));
    };
