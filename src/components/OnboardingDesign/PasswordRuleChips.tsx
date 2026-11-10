import classNames from 'classnames';
import lengthIcon from '../../resources/img/svg/onboarding/pw-length.svg?url';
import numberIcon from '../../resources/img/svg/onboarding/pw-number.svg?url';
import upperIcon from '../../resources/img/svg/onboarding/pw-upper.svg?url';
import lowerIcon from '../../resources/img/svg/onboarding/pw-lower.svg?url';
import specialIcon from '../../resources/img/svg/onboarding/pw-special.svg?url';
import { type PasswordRuleId, passwordRules } from './passwordRules';
import styles from './styles.module.scss';

const ICONS: Record<PasswordRuleId, string> = {
    length: lengthIcon,
    number: numberIcon,
    upper: upperIcon,
    lower: lowerIcon,
    special: specialIcon,
};

export interface PasswordRuleChipsProps {
    password: string;
    /** Visible chip text per rule, e.g. "min. 16 Zeichen". */
    labels: Record<PasswordRuleId, string>;
    /** Accessible name of the list. */
    listLabel: string;
    metLabel: string;
    openLabel: string;
}

/**
 * Password rules as chips, the pattern of the app's registration step
 * (ORISO-Frontend `PasswordRuleChips`): met rules collapse to their icon and
 * move to the front, open rules keep their text. State is never colour alone —
 * every chip announces "erfüllt" / "offen".
 */
export const PasswordRuleChips = ({ password, labels, listLabel, metLabel, openLabel }: PasswordRuleChipsProps) => {
    const rules = passwordRules
        .map((rule) => ({ ...rule, met: rule.validate(password) }))
        .sort((a, b) => Number(b.met) - Number(a.met));

    return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the list scrolls sideways on narrow screens
        <ul className={styles.chips} aria-label={listLabel} tabIndex={0}>
            {rules.map((rule) => (
                <li
                    key={rule.id}
                    className={classNames(styles.chip, { [styles.chipMet]: rule.met })}
                    aria-label={`${labels[rule.id]}: ${rule.met ? metLabel : openLabel}`}
                >
                    <span
                        aria-hidden
                        className={styles.chipIcon}
                        style={{ maskImage: `url("${ICONS[rule.id]}")`, WebkitMaskImage: `url("${ICONS[rule.id]}")` }}
                    />
                    {!rule.met && <span>{labels[rule.id]}</span>}
                </li>
            ))}
        </ul>
    );
};
