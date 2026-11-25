import type { PasswordRuleId } from './passwordRules';
import { ONBOARDING_PASSWORD_MIN_LENGTH } from './passwordRules';

/**
 * German copy of the design boards. Presentational components take their text
 * as props; this is the single place the stories (and later the i18n keys) read
 * it from, so wording changes happen once.
 */
export const ruleLabels: Record<PasswordRuleId, string> = {
    length: `min. ${ONBOARDING_PASSWORD_MIN_LENGTH} Zeichen`,
    number: '1x Zahl',
    upper: '1x Großbuchstabe',
    lower: '1x Kleinbuchstabe',
    special: '1x Sonderzeichen',
};

export const passwordCopy = {
    password: 'Passwort',
    repeat: 'Passwort wiederholen',
    show: 'Passwort anzeigen',
    hide: 'Passwort verbergen',
    ruleList: 'Passwort-Anforderungen',
    met: 'erfüllt',
    open: 'offen',
    mismatch: 'Die Passwörter stimmen nicht überein.',
};
