import type { Rule } from 'antd/es/form';

/**
 * SINGLE SOURCE for the consultant credential policy shared by the normal
 * admin consultant form (`src/pages/users/Edit`) and the public counsellor
 * onboarding wizard (#997). The wizard's contract is to mirror the normal
 * flow — a credential the admin form would reject must never reach
 * UserService from the wizard either, and vice versa. Message keys are the
 * existing `message.error.*` translations, so both surfaces speak the same
 * words.
 */

/** Lowercase letters, digits, hyphen, underscore — the Keycloak-safe subset. */
export const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

export const PASSWORD_MIN_LENGTH = 8;

/** Lower + upper + digit + special, at least {@link PASSWORD_MIN_LENGTH} chars. */
export const PASSWORD_POLICY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export type UsernameErrorKey = 'message.error.username.required' | 'message.error.username.format';
export type PasswordErrorKey = 'message.error.password.minLength' | 'message.error.password.policy';

/** Field-level verdict for controlled forms (the wizard); null = valid. */
export const usernameErrorKey = (value: string): UsernameErrorKey | null => {
    if (value.trim().length === 0) return 'message.error.username.required';
    if (!USERNAME_PATTERN.test(value.trim())) return 'message.error.username.format';
    return null;
};

/** Field-level verdict for controlled forms (the wizard); null = valid. */
export const passwordErrorKey = (value: string): PasswordErrorKey | null => {
    if (value.length < PASSWORD_MIN_LENGTH) return 'message.error.password.minLength';
    if (!PASSWORD_POLICY_PATTERN.test(value)) return 'message.error.password.policy';
    return null;
};

type Translate = (key: string) => string;

/** antd Form rules for the admin form's username field. */
export const usernameFormRules = (t: Translate): Rule[] => [
    { required: true, message: t('message.error.username.required') },
    { pattern: USERNAME_PATTERN, message: t('message.error.username.format') },
];

/**
 * antd Form rules for the admin form's password field. The caller prepends
 * its own required rule (the Edit form shares one across all fields).
 */
export const passwordFormRules = (t: Translate): Rule[] => [
    { min: PASSWORD_MIN_LENGTH, message: t('message.error.password.minLength') },
    { pattern: PASSWORD_POLICY_PATTERN, message: t('message.error.password.policy') },
];
