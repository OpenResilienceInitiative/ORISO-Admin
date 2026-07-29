/** The submitted one-time password did not match — the 2FA setup can be retried. */
export class TwoFactorCodeInvalidError extends Error {
    constructor() {
        super('TWO_FACTOR_CODE_INVALID');
        Object.setPrototypeOf(this, TwoFactorCodeInvalidError.prototype);
    }
}
