import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
    LegalConsentHeadIcon,
    LegalConsentTemplateEditor,
    PlaceholderTemplateDialog,
} from '../../../../PlaceholderTemplate';
import { useConsentTemplates } from '../../hooks/useConsentTemplates';
import {
    hasMandatoryConsentToken,
    isBlankConsentText,
    MANDATORY_CONSENT_TOKEN,
} from '../../utils/consentTextValidation';
import styles from './styles.module.scss';

export interface LegalConsentFieldProps {
    /** The consent sentence of the language currently being edited. */
    value: string;
    /** Language code being edited — shown on the field label so the map stays legible. */
    language: string;
    onChange: (next: string) => void;
    /** Viewers (no legal-text edit permission) and version look-back render read-only. */
    readOnly?: boolean;
    /**
     * The HOST already offers the template chooser — the department card lifts it
     * into the editor's function bar (agency level, owner decision 2026-08-19), so
     * this module must not draw a second, identical one. The choice itself is not
     * taken away; only its location moves.
     */
    hideTemplateChooser?: boolean;
    /** Lets a surrounding split button own the visible dialog trigger. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

/**
 * Consent sentence of the data-protection policy (ADR-021 decision 4) — edited in
 * the house placeholder-template dialog (#862 / Storybook `LegalConsentInDialog`).
 *
 * Closed surface is an outline CTA matching the M3 function-bar split buttons,
 * meant to sit left of the Fachbereich dropdown inside the card. The dialog
 * portals out so the fixed 800×740 card never stretches.
 */
export const LegalConsentField = ({
    value,
    language,
    onChange,
    readOnly,
    hideTemplateChooser,
    open: openProp,
    onOpenChange,
    hideTrigger,
}: LegalConsentFieldProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const [activeTemplateId, setActiveTemplateId] = useState<number | string | undefined>(undefined);
    const templates = useConsentTemplates(language);
    const dialogOpen = openProp ?? open;
    const setDialogOpen = (next: boolean) => {
        if (openProp === undefined) setOpen(next);
        onOpenChange?.(next);
    };

    // Owner call 2026-09-23: an empty field opens with the platform template written in, instead of
    // a notice explaining what applies while it is empty. Clearing it is then a deliberate act, and
    // the empty state is reported as the error it is.
    const templateText = templates[0]?.values?.text ?? '';
    const seed = (current: string) => (isBlankConsentText(current) ? templateText : current);

    useEffect(() => {
        if (dialogOpen) {
            setDraft(seed(value));
            setActiveTemplateId(undefined);
        }
        // `seed` is derived from the template of the current language; adding it would re-seed on
        // every render of the parent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogOpen, value, templateText]);

    const missingMandatoryToken = !isBlankConsentText(value) && !hasMandatoryConsentToken(value);
    const draftMissingMandatoryToken = !isBlankConsentText(draft) && !hasMandatoryConsentToken(draft);

    const openDialog = () => {
        setDraft(seed(value));
        setActiveTemplateId(undefined);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setDraft(seed(value));
        setActiveTemplateId(undefined);
    };

    const saveDialog = () => {
        if (!readOnly) {
            onChange(draft);
        }
        setDialogOpen(false);
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
            {!hideTrigger && (
                <button
                    type="button"
                    className={classNames(styles.trigger, missingMandatoryToken && styles.triggerDanger)}
                    data-testid="consent-edit-trigger"
                    data-missing-token={missingMandatoryToken || undefined}
                    onClick={openDialog}
                >
                    {readOnly ? t('legal.consent.viewButton') : t('legal.consent.editButton')}
                </button>
            )}
            {dialogOpen && (
                <PlaceholderTemplateDialog
                    icon={<LegalConsentHeadIcon data-testid="legal-consent-head-icon" />}
                    titleKey="placeholderTemplate.dialog.legalTitle"
                    descriptionKey="legal.consent.description"
                    onSave={saveDialog}
                    onClose={closeDialog}
                    saveDisabled={readOnly}
                    /* This dialog hands the sentence back to the editor; the
                       policy — body and sentence together — is stored by the
                       editor's own Publish / Save-draft action. A button
                       labelled "Speichern" promised a save that had not
                       happened, so the sentence looked stored and was gone
                       after a reload (#929). */
                    okLabelKey="legal.consent.apply"
                >
                    <div className={styles.dialogBody}>
                        {isBlankConsentText(draft) && (
                            <Alert
                                className={styles.notice}
                                type="error"
                                showIcon
                                data-testid="consent-empty-error"
                                message={t('legal.consent.error.empty.title')}
                                description={t('legal.consent.error.empty.description')}
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
                            hideTemplateChooser={hideTemplateChooser}
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
