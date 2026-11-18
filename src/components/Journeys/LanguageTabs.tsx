import { useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { languageStates, type JourneyStep, type LanguageState } from './journey';
import { TranslateIcon } from './TranslateIcon';
import styles from './styles.module.scss';

/** "DE du" for the informal German, the upper-case code for every other language. */
export const languageCode = (language: string) => (language === 'de@informal' ? 'DE du' : language.toUpperCase());

export interface LanguageOption {
    language: string;
    /** What follows the language name for screen readers, e.g. "maschinell übersetzt". */
    state: string;
    /** The small mark after the code (check, count, …); hidden from screen readers. */
    mark?: ReactNode;
    /** Extra class for the state colour. */
    className?: string;
}

interface LanguageRadioGroupProps {
    label: string;
    options: LanguageOption[];
    value: string;
    onChange: (language: string) => void;
}

/**
 * Languages side by side as one radio group: a single tab stop, arrow keys move between the
 * languages (and choose them), Home and End jump to the first and last (WAI-ARIA radio group).
 */
export const LanguageRadioGroup = ({ label, options, value, onChange }: LanguageRadioGroupProps) => {
    const { t } = useTranslation();
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const current = Math.max(
        0,
        options.findIndex((option) => option.language === value),
    );

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const last = options.length - 1;
        const next = (() => {
            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    return current === last ? 0 : current + 1;
                case 'ArrowLeft':
                case 'ArrowUp':
                    return current === 0 ? last : current - 1;
                case 'Home':
                    return 0;
                case 'End':
                    return last;
                default:
                    return undefined;
            }
        })();
        if (next === undefined) return;
        event.preventDefault();
        onChange(options[next].language);
        buttons.current[next]?.focus();
    };

    return (
        <div className={styles.languageTabs} role="radiogroup" aria-label={label}>
            {options.map((option, index) => {
                const code = languageCode(option.language);
                const checked = index === current;
                return (
                    <button
                        key={option.language}
                        ref={(node) => {
                            buttons.current[index] = node;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        aria-label={`${code} – ${t(`language.${option.language}`, option.language)}, ${option.state}`}
                        className={classNames(styles.languageTab, option.className, {
                            [styles.languageTabOn]: checked,
                        })}
                        onClick={() => onChange(option.language)}
                        onKeyDown={onKeyDown}
                    >
                        {code}
                        {option.mark !== undefined && option.mark !== null && <span aria-hidden>{option.mark}</span>}
                    </button>
                );
            })}
        </div>
    );
};

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
 * The seven languages of a step side by side, each with its state, so the editor sees at a glance
 * which language is original, checked, machine-made or missing, and switches with one click.
 */
export const LanguageTabs = ({ step, value, onChange }: LanguageTabsProps) => {
    const { t } = useTranslation();
    return (
        <LanguageRadioGroup
            label={t('journeys.translation.editIn')}
            value={value}
            onChange={onChange}
            options={languageStates(step).map(({ language, state }) => ({
                language,
                state: t(`journeys.translation.state.${state}`),
                mark: STATE_MARK[state],
                className: styles[`languageTab_${state}`],
            }))}
        />
    );
};
