import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { M3Checkbox } from '../M3Checkbox';
import {
    PlaceholderTemplateEditor,
    type PlaceholderTemplateDefinition,
    type PlaceholderTemplateFieldConfig,
} from './PlaceholderTemplateEditor';
import { fillPlaceholders, LEGAL_CONSENT_TOKENS, sampleValues } from './placeholderTokens';
import { TokenizedText } from './TokenizedText';
import styles from './PlaceholderTemplateEditor.module.scss';

export interface LegalConsentTemplateValues extends Record<string, string> {
    text: string;
}

export interface LegalConsentTemplateEditorProps {
    values: LegalConsentTemplateValues;
    onChange: (next: LegalConsentTemplateValues) => void;
    templates: PlaceholderTemplateDefinition<LegalConsentTemplateValues>[];
    activeTemplateId?: number | string;
    onSelectTemplate: (id: number | string) => void;
    onCreateFromTemplate?: (id: number | string) => void;
    /**
     * Fixed, non-editable text rendered UNDER the sentence in the preview — the
     * cookie/authentication notice the platform always appends (ADR-021 decision
     * 2). It is part of what the help-seeker reads, so leaving it out of the
     * preview would show the admin a sentence that does not exist in that form.
     */
    addendum?: ReactNode;
    /** Optional label of the language this sentence belongs to (multilingual editors). */
    languageLabel?: string;
}

/**
 * Variant 2 — legal/consent sentence (registration: "Ich habe die
 * Datenschutzerklärung … zur Kenntnis genommen"): one multiline template field
 * whose live preview renders the sentence exactly as registration will — as a
 * checkbox label (reused {@link M3Checkbox}), with sample values substituted
 * and unresolved tokens kept visible as `{{key}}` chips.
 */
export const LegalConsentTemplateEditor = ({
    values,
    onChange,
    templates,
    activeTemplateId,
    onSelectTemplate,
    onCreateFromTemplate,
    addendum,
    languageLabel,
}: LegalConsentTemplateEditorProps) => {
    const { t } = useTranslation();
    const sentenceId = useId();
    // Local, demo-only checkbox state so the preview feels like the real form.
    const [accepted, setAccepted] = useState(false);
    const samples = useMemo(() => sampleValues(LEGAL_CONSENT_TOKENS), []);

    const fields: PlaceholderTemplateFieldConfig<LegalConsentTemplateValues>[] = [
        {
            name: 'text',
            label: languageLabel
                ? `${t('placeholderTemplate.legal.text', 'Einwilligungstext')} (${languageLabel})`
                : t('placeholderTemplate.legal.text', 'Einwilligungstext'),
            multiline: true,
            rows: 6,
        },
    ];

    return (
        <PlaceholderTemplateEditor
            activeTemplateId={activeTemplateId}
            fields={fields}
            heading={t('placeholderTemplate.legal.heading', 'Einwilligung (Registrierung)')}
            preview={
                <section
                    aria-label={t('placeholderTemplate.legal.previewLabel', 'Vorschau der Einwilligung')}
                    className={styles.consentPreview}
                >
                    <span className={styles.consentPreviewCaption}>
                        {t('placeholderTemplate.legal.previewCaption', 'So sieht der Satz in der Registrierung aus:')}
                    </span>
                    <div className={styles.consentRow}>
                        <M3Checkbox
                            checked={accepted}
                            describedById={sentenceId}
                            label={t('placeholderTemplate.legal.checkboxLabel', 'Einwilligung')}
                            onChange={setAccepted}
                        />
                        <span className={styles.consentSentence} id={sentenceId}>
                            <TokenizedText text={fillPlaceholders(values.text, samples)} />
                        </span>
                    </div>
                    {addendum}
                </section>
            }
            templates={templates}
            tokens={LEGAL_CONSENT_TOKENS}
            values={values}
            onChange={onChange}
            onCreateFromTemplate={onCreateFromTemplate}
            onSelectTemplate={onSelectTemplate}
        />
    );
};
