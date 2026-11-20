import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Undo from '@mui/icons-material/Undo';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { IconButton } from '../IconButton';
import { MODULE_SOURCE_LANGUAGE, type LangMap } from '../ConversationModules/conversationModule';
import { plain } from './stepText';
import { lengthState } from './journeyTextLimits';
import { TranslateIcon } from './TranslateIcon';
import styles from './styles.module.scss';

/** How a text of one language came about. */
export type TextChange = 'typed' | 'machine' | 'reset';

interface OriginalLineProps {
    value: LangMap | undefined;
    language: string;
    /** This language of the step was written by a machine and nobody has checked it yet. */
    machine: boolean;
    /**
     * Machine-translates the original into this field's language. The parent writes the answer
     * into the field as it is then (by the field's path), so nothing typed meanwhile is lost.
     */
    onTranslate?: () => Promise<void>;
    onChange: (next: LangMap, how: TextChange) => void;
}

/**
 * Under a field in another language than the original: the original text, so the editor always
 * sees what is being translated; a translate button for this one field; and "back to the original",
 * which removes the translation — the person then reads the original (ADR-018 decision 8).
 */
export const OriginalLine = ({ value, language, machine, onTranslate, onChange }: OriginalLineProps) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    if (language === MODULE_SOURCE_LANGUAGE) return null;
    const source = value?.[MODULE_SOURCE_LANGUAGE];
    const own = value?.[language];
    const languageName = t(`language.${language}`, language);
    const sourceText = plain(source);

    return (
        <div className={styles.originalLine}>
            <span className={styles.originalText}>
                <span className={styles.originalLabel}>{t('journeys.field.original')}</span>
                {sourceText || t('journeys.field.noOriginal')}
            </span>
            {machine && plain(own) && (
                // The original is visible next to it; the hover repeats it beside the mark.
                <span
                    className={styles.machineMark}
                    role="img"
                    aria-label={t('journeys.translation.state.machine')}
                    title={t('journeys.field.machineFrom', { original: sourceText })}
                >
                    <TranslateIcon />
                </span>
            )}
            {onTranslate && sourceText && (
                <IconButton
                    icon={<TranslateIcon />}
                    size={32}
                    disabled={busy}
                    ariaLabel={t('journeys.field.translate', { language: languageName })}
                    title={t('journeys.field.translate', { language: languageName })}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onTranslate();
                        } finally {
                            setBusy(false);
                        }
                    }}
                />
            )}
            {plain(own) && (
                <IconButton
                    icon={<Undo />}
                    size={32}
                    ariaLabel={t('journeys.field.reset', { language: languageName })}
                    title={t('journeys.field.reset', { language: languageName })}
                    onClick={() => {
                        const next = { ...value };
                        delete next[language];
                        onChange(next, 'reset');
                    }}
                />
            )}
        </div>
    );
};

interface TranslatableFieldProps extends OriginalLineProps {
    label: string;
    testId?: string;
    /**
     * How many characters fit where the text is shown (`TEXT_LIMITS`). Near it the field says how
     * many are left; over it the field is marked "zu lang" with how many are too many.
     */
    maxLength?: number;
}

/** A one-line text in the language being edited, with the original under it. */
export const TranslatableField = ({ label, testId, maxLength, ...line }: TranslatableFieldProps) => {
    const { t } = useTranslation();
    const { value, language, onChange } = line;
    const length = maxLength ? lengthState(value?.[language], maxLength) : ({ kind: 'ok' } as const);
    let supportingText: string | undefined;
    if (length.kind === 'warn') supportingText = t('journeys.length.left', { count: length.left });
    if (length.kind === 'over') supportingText = t('journeys.length.over', { count: length.over });
    return (
        <div className={styles.translatable} data-testid={testId} data-length={length.kind}>
            <FloatingLabelInput
                label={label}
                error={length.kind === 'over'}
                supportingText={supportingText}
                value={value?.[language] ?? ''}
                placeholder={language === MODULE_SOURCE_LANGUAGE ? undefined : plain(value?.[MODULE_SOURCE_LANGUAGE])}
                onChange={(event) => onChange({ ...value, [language]: event.target.value }, 'typed')}
            />
            <OriginalLine {...line} />
        </div>
    );
};
