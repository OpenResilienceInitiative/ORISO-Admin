import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckBoxIcon } from '../CustomIcons/LegalIcons';
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

/**
 * Head symbol of the consent sentence — the house checkbox glyph, because the
 * sentence IS the checkbox the help-seeker ticks during registration (owner
 * call 2026-08-20; the earlier MUI `FactCheckOutlined` was not from the house
 * set). An alias, not a wrapper, so the full-page editor head, the dialog hero
 * icon and the template split button use one symbol instead of drifting apart.
 * Decorative everywhere it is used.
 */
export const LegalConsentHeadIcon = CheckBoxIcon;

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
    /**
     * Read-only surface: the sentence field, its token picker, the template
     * chooser and the preview checkbox all go inert. Without this the controls
     * stay focusable and typing snaps back — an editable-looking field for
     * someone who lacks the legal-text permission, or who is looking at an
     * archived version.
     */
    readOnly?: boolean;
    /** The host draws the template chooser itself — see PlaceholderTemplateEditor. */
    hideTemplateChooser?: boolean;
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
    readOnly = false,
    hideTemplateChooser = false,
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
            hideTemplateChooser={hideTemplateChooser}
            heading={t('placeholderTemplate.legal.heading', 'Einwilligung (Registrierung)')}
            icon={<LegalConsentHeadIcon />}
            preview={
                <section
                    aria-label={t('placeholderTemplate.legal.previewLabel', 'Vorschau der Einwilligung')}
                    className={styles.consentPreview}
                >
                    <span className={styles.consentPreviewCaption}>
                        {t('placeholderTemplate.legal.previewCaption', 'So sieht der Satz in der Registrierung aus:')}
                    </span>
                    {/* The preview checkbox stays live even on a read-only surface: it
                        demonstrates the registration form and writes nothing. Disabling
                        it would show a greyed-out box that is not what the help-seeker
                        gets — the preview would then misrepresent the real sentence. */}
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
            readOnly={readOnly}
            // The consent sentence is rendered as a CHECKBOX label in registration
            // (see the preview below), so the checkbox is the glyph that names this
            // template — not the generic document icon the invite templates use.
            // Outline, not filled: filled is this set's selected state.
            templateIcon={<CheckBoxIcon />}
            templates={templates}
            tokens={LEGAL_CONSENT_TOKENS}
            values={values}
            onChange={onChange}
            onCreateFromTemplate={onCreateFromTemplate}
            onSelectTemplate={onSelectTemplate}
        />
    );
};
