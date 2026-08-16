import { useMemo, useState } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { LegalConsentTemplateEditor, type LegalConsentTemplateValues } from '../../../../PlaceholderTemplate';
import {
    hasMandatoryConsentToken,
    isBlankConsentText,
    MANDATORY_CONSENT_TOKEN,
} from '../../utils/consentTextValidation';
import styles from './styles.module.scss';

const PLATFORM_TEMPLATE_ID = 'platform';

export interface LegalConsentFieldProps {
    /** The consent sentence of the language currently being edited. */
    value: string;
    /** Language code being edited — shown on the field label so the map stays legible. */
    language: string;
    onChange: (next: string) => void;
    /** Viewers (no legal-text edit permission) and version look-back render read-only. */
    readOnly?: boolean;
    /**
     * The sentence is inherited from a higher level of the ladder and has not been
     * overridden here (ADR-021 decision 1 — a document without its level is not a
     * valid statement, so the card says which one it is showing).
     */
    inheritedFrom?: string;
}

/**
 * The consent sentence a help-seeker ticks — a FIELD of the data-protection
 * policy, not a document of its own (ADR-021 decision 4). It therefore lives
 * inside the DPP card and is published with it: changing the wording means
 * publishing a new policy version whose body text may be unchanged.
 *
 * Two rules are visible here:
 * - `{{legal_links}}` is mandatory. A Träger sentence REPLACES the platform
 *   sentence, so without the links the help-seeker could not reach the documents
 *   being agreed to. The server rejects such a publish (ADR-021 decision 2); this
 *   is the same check, run before the request so the admin is not sent into a 400.
 * - the cookie/authentication notice is appended by the platform and is not
 *   editable — shown in the preview so the admin sees the real sentence.
 */
export const LegalConsentField = ({ value, language, onChange, readOnly, inheritedFrom }: LegalConsentFieldProps) => {
    const { t } = useTranslation();
    const [activeTemplateId, setActiveTemplateId] = useState<number | string | undefined>(undefined);

    const templates = useMemo(
        () => [
            {
                id: PLATFORM_TEMPLATE_ID,
                name: t('legal.consent.template.platform.name'),
                values: { text: t('legal.consent.template.platform.text') } as LegalConsentTemplateValues,
            },
        ],
        [t],
    );

    // Only an authored sentence can violate the rule — an empty field means the
    // level above still applies, which is a valid state, not an error.
    const missingMandatoryToken = !isBlankConsentText(value) && !hasMandatoryConsentToken(value);

    const applyTemplate = (id: number | string) => {
        const template = templates.find((entry) => entry.id === id);
        if (!template || readOnly) return;
        setActiveTemplateId(id);
        onChange(template.values.text);
    };

    return (
        <section aria-label={t('legal.consent.section.label')} className={styles.consentField}>
            <p className={styles.description}>{t('legal.consent.description')}</p>
            {/* An empty field is a valid state, not a gap: it means the level above
                still governs. Saying so beats leaving an ambiguous blank box (#769). */}
            {(inheritedFrom || isBlankConsentText(value)) && (
                <Alert
                    className={styles.notice}
                    type="info"
                    showIcon
                    data-testid="consent-inherited-notice"
                    message={
                        inheritedFrom
                            ? t('legal.consent.inherited', { level: inheritedFrom })
                            : t('legal.consent.emptyMeansInherited')
                    }
                />
            )}
            <LegalConsentTemplateEditor
                activeTemplateId={activeTemplateId}
                addendum={
                    <p className={styles.addendum} data-testid="consent-fixed-addendum">
                        <span className={styles.addendumText}>{t('legal.consent.cookieNotice.text')}</span>
                        <span className={styles.addendumCaption}>{t('legal.consent.cookieNotice.caption')}</span>
                    </p>
                }
                languageLabel={t(`language.${language}`, language.toUpperCase())}
                readOnly={readOnly}
                templates={templates}
                values={{ text: value }}
                onChange={(next) => {
                    if (!readOnly) onChange(next.text);
                }}
                onSelectTemplate={applyTemplate}
            />
            {missingMandatoryToken && (
                <Alert
                    className={styles.notice}
                    type="error"
                    showIcon
                    data-testid="consent-missing-token-error"
                    message={t('legal.consent.error.missingLegalLinks.title')}
                    description={
                        <>
                            {t('legal.consent.error.missingLegalLinks.description')}{' '}
                            {/* The token is composed in JSX, never interpolated: i18next
                                treats `{{…}}` inside a translation as its own syntax and
                                would swallow the very string we are naming. */}
                            <code>{`{{${MANDATORY_CONSENT_TOKEN}}}`}</code>
                        </>
                    }
                />
            )}
        </section>
    );
};

export default LegalConsentField;
