import { useMemo, useState } from 'react';
import { Alert } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
    LegalConsentTemplateEditor,
    PlaceholderTemplateDialog,
    type LegalConsentTemplateValues,
} from '../../../../PlaceholderTemplate';
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
 * Consent sentence of the data-protection policy (ADR-021 decision 4) — edited in
 * the house placeholder-template dialog (#862 / Storybook `LegalConsentInDialog`).
 *
 * Closed surface is an outline CTA matching the M3 function-bar split buttons,
 * meant to sit left of the Fachbereich dropdown inside the card. The dialog
 * portals out so the fixed 800×740 card never stretches.
 */
export const LegalConsentField = ({ value, language, onChange, readOnly, inheritedFrom }: LegalConsentFieldProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
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

    const missingMandatoryToken = !isBlankConsentText(value) && !hasMandatoryConsentToken(value);
    const draftMissingMandatoryToken = !isBlankConsentText(draft) && !hasMandatoryConsentToken(draft);

    const openDialog = () => {
        setDraft(value);
        setActiveTemplateId(undefined);
        setOpen(true);
    };

    const closeDialog = () => {
        setOpen(false);
        setDraft(value);
        setActiveTemplateId(undefined);
    };

    const saveDialog = () => {
        if (!readOnly) {
            onChange(draft);
        }
        setOpen(false);
        setActiveTemplateId(undefined);
    };

    const applyTemplate = (id: number | string) => {
        const template = templates.find((entry) => entry.id === id);
        if (!template || readOnly) return;
        setActiveTemplateId(id);
        setDraft(template.values.text);
    };

    const cookieAddendum = (
        <p className={styles.addendum} data-testid="consent-fixed-addendum">
            <span className={styles.addendumText}>{t('legal.consent.cookieNotice.text')}</span>
            <span className={styles.addendumCaption}>{t('legal.consent.cookieNotice.caption')}</span>
        </p>
    );

    return (
        <>
            <button
                type="button"
                className={classNames(styles.trigger, missingMandatoryToken && styles.triggerDanger)}
                data-testid="consent-edit-trigger"
                data-missing-token={missingMandatoryToken || undefined}
                onClick={openDialog}
            >
                {readOnly ? t('legal.consent.viewButton') : t('legal.consent.editButton')}
            </button>
            {open && (
                <PlaceholderTemplateDialog
                    titleKey="placeholderTemplate.dialog.legalTitle"
                    descriptionKey="legal.consent.description"
                    onSave={saveDialog}
                    onClose={closeDialog}
                    saveDisabled={readOnly}
                >
                    <div className={styles.dialogBody}>
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
                        {draftMissingMandatoryToken && (
                            <Alert
                                className={styles.notice}
                                type="error"
                                showIcon
                                data-testid="consent-missing-token-error"
                                message={t('legal.consent.error.missingLegalLinks.title')}
                                description={
                                    <>
                                        {t('legal.consent.error.missingLegalLinks.description')}{' '}
                                        <code>{`{{${MANDATORY_CONSENT_TOKEN}}}`}</code>
                                    </>
                                }
                            />
                        )}
                        <LegalConsentTemplateEditor
                            activeTemplateId={activeTemplateId}
                            addendum={cookieAddendum}
                            languageLabel={t(`language.${language}`, language.toUpperCase())}
                            readOnly={readOnly}
                            templates={templates}
                            values={{ text: draft }}
                            onChange={(next) => {
                                if (!readOnly) setDraft(next.text);
                            }}
                            onSelectTemplate={applyTemplate}
                        />
                    </div>
                </PlaceholderTemplateDialog>
            )}
        </>
    );
};

export default LegalConsentField;
