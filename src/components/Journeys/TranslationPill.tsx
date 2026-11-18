import { useId, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Popover from '@mui/material/Popover';
import Language from '@mui/icons-material/Language';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { M3Button } from '../M3Button';
import { languageStates, translationStatus, type JourneyStep, type LanguageState } from './journey';
import { TranslateIcon } from './TranslateIcon';
import styles from './styles.module.scss';

interface TranslationPillProps {
    step: JourneyStep;
    /** Fills the missing languages by machine. Without it no translation is offered. */
    onTranslate?: () => void;
    /** A person confirms the machine translation of one language. */
    onMarkChecked?: (language: string) => void;
}

const STATE_ICON: Record<LanguageState, ReactElement> = {
    source: <Check aria-hidden />,
    checked: <Check aria-hidden />,
    machine: <TranslateIcon />,
    missing: <Close aria-hidden />,
};

/**
 * How far one step is translated. The pill shows the counts; it opens a menu listing every
 * language as original, checked by hand, machine-translated or missing, where a machine
 * translation can be confirmed and the missing ones translated. Icons and words carry the meaning,
 * colours only repeat it.
 */
export const TranslationPill = ({ step, onTranslate, onMarkChecked }: TranslationPillProps) => {
    const { t } = useTranslation();
    const menuId = useId();
    const titleId = useId();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const { translated, machine, missing } = translationStatus(step);
    const checked = translated.length - machine.length;
    const states = languageStates(step);

    return (
        <span className={styles.translation} data-testid="step-translation">
            <button
                type="button"
                className={styles.translationCounts}
                aria-haspopup="dialog"
                aria-expanded={anchor != null}
                aria-controls={anchor ? menuId : undefined}
                title={t('journeys.translation.open')}
                onClick={(event) => setAnchor(event.currentTarget)}
            >
                <Language aria-hidden />
                <span className={styles.srOnly}>
                    {t('journeys.translation.status', {
                        checked,
                        machine: machine.length,
                        missing: missing.length,
                    })}
                </span>
                <span className={classNames(styles.translationCount, styles.translationDone)} aria-hidden>
                    {checked}
                    <Check />
                </span>
                {machine.length > 0 && (
                    <span className={classNames(styles.translationCount, styles.translationMachine)} aria-hidden>
                        {machine.length}
                        <TranslateIcon />
                    </span>
                )}
                {missing.length > 0 && (
                    <span className={classNames(styles.translationCount, styles.translationMissing)} aria-hidden>
                        {missing.length}
                        <Close />
                    </span>
                )}
            </button>
            {onTranslate && missing.length > 0 && (
                <button
                    type="button"
                    className={styles.translationAi}
                    aria-label={t('journeys.translation.ai')}
                    title={t('journeys.translation.ai')}
                    onClick={onTranslate}
                >
                    <TranslateIcon />
                </button>
            )}
            <Popover
                id={menuId}
                open={anchor != null}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.languageMenu,
                        role: 'dialog',
                        'aria-labelledby': titleId,
                    } as object,
                }}
            >
                <p className={styles.languageMenuTitle} id={titleId}>
                    {t('journeys.translation.open')}
                </p>
                <ul className={styles.languageList} data-testid="step-language-menu">
                    {states.map(({ language, state }) => (
                        <li key={language} className={styles.languageRow}>
                            <span className={styles.languageName}>{t(`language.${language}`, language)}</span>
                            <span className={classNames(styles.languageState, styles[`languageState_${state}`])}>
                                {STATE_ICON[state]}
                                {t(`journeys.translation.state.${state}`)}
                            </span>
                            {state === 'machine' && onMarkChecked && (
                                <M3Button variant="text" onClick={() => onMarkChecked(language)}>
                                    <span aria-hidden>{t('journeys.translation.markChecked')}</span>
                                    <span className={styles.srOnly}>
                                        {t('journeys.translation.markCheckedFor', {
                                            language: t(`language.${language}`, language),
                                        })}
                                    </span>
                                </M3Button>
                            )}
                        </li>
                    ))}
                </ul>
                {onTranslate && missing.length > 0 && (
                    <div className={styles.languageMenuFooter}>
                        <M3Button
                            variant="tonal"
                            icon={<TranslateIcon />}
                            onClick={() => {
                                onTranslate();
                                setAnchor(null);
                            }}
                        >
                            {t('journeys.translation.translateMissing', { count: missing.length })}
                        </M3Button>
                    </div>
                )}
            </Popover>
        </span>
    );
};
