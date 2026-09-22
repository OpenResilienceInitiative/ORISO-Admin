import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
    LegalConsentHeadIcon,
    LegalConsentTemplateEditor,
    PlaceholderTemplateDialog,
} from '../../../../PlaceholderTemplate';
import { PLATFORM_CONSENT_TEMPLATE_ID, useConsentTemplates } from '../../hooks/useConsentTemplates';
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
     * The sentence is inherited from a higher level of the ladder and has not been
     * overridden here (ADR-021 decision 1 — a document without its level is not a
     * valid statement, so the card says which one it is showing).
     */
    inheritedFrom?: string;
    /**
     * The HOST already offers the template chooser — the department card lifts it
     * into the editor's function bar (agency level, owner decision 2026-08-19), so
     * this module must not draw a second, identical one. The choice itself is not
     * taken away; only its location moves.
     */
    hideTemplateChooser?: boolean;
    /**
     * Whether THIS level already owns a consent sentence — blank included.
     *
     * Blankness alone cannot answer that: a level that has never authored one
     * and a level that deliberately cleared its own both read as blank here.
     * Only the first may be offered the platform default; seeding the second
     * would let one press of the confirm button re-author a sentence somebody
     * deliberately removed. The owner of that distinction is the container, so
     * it is passed in rather than guessed.
     */
    hasOwnSentence?: boolean;
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
    inheritedFrom,
    hasOwnSentence = false,
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
    /**
     * What the editor starts from when this level has no sentence of its own.
     *
     * An empty box is not a neutral starting point: it asks an administrator to
     * author a legal sentence from nothing, and it hides the wording that is
     * actually in force meanwhile. In the great majority of cases the required
     * sentence is not in doubt, so the platform's standard wording is offered
     * to adjust instead — it already carries `{{legal_links}}`, so what the
     * admin starts from can never be published invalid.
     *
     * Two surfaces are exempt. Read-only ones report what is stored, and showing
     * someone who cannot save a sentence this level does not have would be a
     * claim about the document rather than a starting point for editing. And a
     * level that already owns its sentence keeps it as it stands, blank
     * included — see `hasOwnSentence`.
     */
    const platformDefault = useMemo(
        () => templates.find((entry) => entry.id === PLATFORM_CONSENT_TEMPLATE_ID)?.values.text ?? '',
        [templates],
    );
    const seedsPlatformDefault =
        !readOnly && !hasOwnSentence && isBlankConsentText(value) && !isBlankConsentText(platformDefault);
    const startingDraft = seedsPlatformDefault ? platformDefault : value;
    const dialogOpen = openProp ?? open;
    const setDialogOpen = (next: boolean) => {
        if (openProp === undefined) setOpen(next);
        onOpenChange?.(next);
    };

    useEffect(() => {
        if (dialogOpen) {
            setDraft(startingDraft);
            setActiveTemplateId(undefined);
        }
    }, [dialogOpen, startingDraft]);

    const missingMandatoryToken = !isBlankConsentText(value) && !hasMandatoryConsentToken(value);
    const draftMissingMandatoryToken = !isBlankConsentText(draft) && !hasMandatoryConsentToken(draft);

    const openDialog = () => {
        setDraft(startingDraft);
        setActiveTemplateId(undefined);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setDraft(startingDraft);
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
                        {(inheritedFrom || isBlankConsentText(value)) && (
                            <Alert
                                className={styles.notice}
                                type="info"
                                showIcon
                                data-testid="consent-inherited-notice"
                                message={
                                    // eslint-disable-next-line no-nested-ternary -- three exclusive states, read top-down
                                    inheritedFrom
                                        ? t('legal.consent.inherited', { level: inheritedFrom })
                                        : seedsPlatformDefault
                                        ? t('legal.consent.seededFromPlatform')
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
