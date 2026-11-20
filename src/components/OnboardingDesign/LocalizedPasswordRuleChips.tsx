import { useTranslation } from 'react-i18next';
import { PasswordRuleChips } from './PasswordRuleChips';
import { ONBOARDING_PASSWORD_MIN_LENGTH } from './passwordRules';

/** The five rule chips with their text from i18n; the length chip names the shared minimum. */
export const LocalizedPasswordRuleChips = ({ password }: { password: string }) => {
    const { t } = useTranslation();
    return (
        <PasswordRuleChips
            password={password}
            labels={{
                length: t('onboarding.password.rule.length', { count: ONBOARDING_PASSWORD_MIN_LENGTH }),
                number: t('onboarding.password.rule.number'),
                upper: t('onboarding.password.rule.upper'),
                lower: t('onboarding.password.rule.lower'),
                special: t('onboarding.password.rule.special'),
            }}
            listLabel={t('onboarding.password.ruleList')}
            metLabel={t('onboarding.password.met')}
            openLabel={t('onboarding.password.open')}
        />
    );
};
