import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Language from '@mui/icons-material/Language';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { translationStatus, type JourneyStep } from './journey';
import styles from './styles.module.scss';

interface TranslationPillProps {
    step: JourneyStep;
    /** Fills the missing languages by machine. Without it the button is not shown. */
    onTranslate?: () => void;
}

/**
 * How far one step is translated: languages a person wrote, languages a machine wrote and nobody
 * checked yet, and missing ones. Signs and numbers carry the meaning, the colours only repeat it.
 */
export const TranslationPill = ({ step, onTranslate }: TranslationPillProps) => {
    const { t } = useTranslation();
    const { translated, machine, missing } = translationStatus(step);
    const checked = translated.length - machine.length;

    return (
        <span className={styles.translation} data-testid="step-translation">
            <span className={styles.translationCounts}>
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
                        <AutoAwesomeOutlined />
                    </span>
                )}
                {missing.length > 0 && (
                    <span className={classNames(styles.translationCount, styles.translationMissing)} aria-hidden>
                        {missing.length}
                        <Close />
                    </span>
                )}
            </span>
            {onTranslate && missing.length > 0 && (
                <button
                    type="button"
                    className={styles.translationAi}
                    aria-label={t('journeys.translation.ai')}
                    title={t('journeys.translation.ai')}
                    onClick={onTranslate}
                >
                    <AutoAwesomeOutlined aria-hidden />
                    {t('journeys.translation.aiShort')}
                </button>
            )}
        </span>
    );
};
