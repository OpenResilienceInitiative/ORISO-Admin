import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { languageStates, type JourneyStep, type LanguageState } from './journey';
import { TranslateIcon } from './TranslateIcon';
import styles from './styles.module.scss';

const STATE_MARK: Record<LanguageState, ReactElement | null> = {
    source: null,
    checked: <Check />,
    machine: <TranslateIcon />,
    missing: <Close />,
};

interface LanguageTabsProps {
    step: JourneyStep;
    value: string;
    onChange: (language: string) => void;
}

/**
 * The seven languages side by side, each with its state, so the editor sees at a glance which
 * language is original, checked, machine-made or missing, and switches with one click.
 */
export const LanguageTabs = ({ step, value, onChange }: LanguageTabsProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.languageTabs} role="radiogroup" aria-label={t('journeys.translation.editIn')}>
            {languageStates(step).map(({ language, state }) => {
                const code = language === 'de@informal' ? 'DE du' : language.toUpperCase();
                return (
                    <button
                        key={language}
                        type="button"
                        role="radio"
                        aria-checked={value === language}
                        aria-label={`${code} – ${t(`language.${language}`, language)}, ${t(
                            `journeys.translation.state.${state}`,
                        )}`}
                        className={classNames(styles.languageTab, styles[`languageTab_${state}`], {
                            [styles.languageTabOn]: value === language,
                        })}
                        onClick={() => onChange(language)}
                    >
                        {code}
                        {STATE_MARK[state] && <span aria-hidden>{STATE_MARK[state]}</span>}
                    </button>
                );
            })}
        </div>
    );
};
