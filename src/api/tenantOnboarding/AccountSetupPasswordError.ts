/**
 * Why UserService refused the password of an existing-account setup with a 400 (Admin#1207). The
 * claim is released in both cases, so the same link can be used again with another password.
 * UNCHANGED: the password equals the one-time password. REJECTED: any other refusal (e.g. policy).
 */
export type AccountSetupPasswordRejection = 'UNCHANGED' | 'REJECTED';

export class AccountSetupPasswordError extends Error {
    readonly rejection: AccountSetupPasswordRejection;

    constructor(rejection: AccountSetupPasswordRejection) {
        super(`ACCOUNT_SETUP_PASSWORD_${rejection}`);
        this.rejection = rejection;
        Object.setPrototypeOf(this, AccountSetupPasswordError.prototype);
    }
}
