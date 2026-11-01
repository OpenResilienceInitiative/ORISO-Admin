/**
 * One password rule for every invited-account screen (owner, 2026-10-13):
 * 16 characters, as the app's registration already demands. Träger admin
 * used 9 and counsellor / BST admin 8 before. The server must enforce the
 * same number before the production validators change.
 */
export const ONBOARDING_PASSWORD_MIN_LENGTH = 16;

export type PasswordRuleId = 'length' | 'number' | 'upper' | 'lower' | 'special';

export interface PasswordRule {
    id: PasswordRuleId;
    validate: (value: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
    { id: 'length', validate: (value) => value.length >= ONBOARDING_PASSWORD_MIN_LENGTH },
    { id: 'number', validate: (value) => /\d/.test(value) },
    { id: 'upper', validate: (value) => /[A-Z]/.test(value) },
    { id: 'lower', validate: (value) => /[a-z]/.test(value) },
    { id: 'special', validate: (value) => /[^A-Za-z0-9\s]/.test(value) },
];

export const allPasswordRulesMet = (value: string): boolean => passwordRules.every((rule) => rule.validate(value));
