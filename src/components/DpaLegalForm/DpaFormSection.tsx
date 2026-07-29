import classNames from 'classnames';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';
import { useTranslation } from 'react-i18next';
import { M3Checkbox } from '../M3Checkbox';
import { MuiFormField } from '../mui/MuiFormField';
import { DpaLegalReader } from './DpaLegalReader';
import styles from './styles.module.scss';

/** Wrapper id of the consent control — hosts jump here on an incomplete submit. */
export const DPA_CONSENT_ANCHOR_ID = 'dpa-consent';

/**
 * Brings the deliberate legal act into view and onto the keyboard after a
 * submit that failed because the box is still unticked (#594.6).
 */
export const focusDpaConsent = () => {
    const host = document.getElementById(DPA_CONSENT_ANCHOR_ID);
    host?.scrollIntoView?.({ block: 'center' });
    host?.querySelector<HTMLElement>('[role="checkbox"]')?.focus?.();
};

export interface DpaFormSectionProps {
    /** Sanitized HTML of the published legal text (host applies DOMPurify + language pick). */
    dpaHtml: string;
    /** Accessible name / card title of the legal-text reader. */
    textLabel: string;
    /** Optional intro line shown in the reader's help-text block. */
    textDescription?: React.ReactNode;
    accepted: boolean;
    acceptTouched: boolean;
    /** Toggle handler — the host owns the accepted/touched state (it gates its own submit). */
    onAcceptedChange: (value: boolean) => void;
}

/**
 * The ONE shared DPA/AVV form block (#569 hardening): the canonical read-only
 * reader with its chapter chips, the established signer fields (mirroring
 * `DpaSignature`, src/types/dpa.ts) and the explicit confirmation.
 *
 * Consent (#594.5): ticking the box IS the signature, so it is not a footnote
 * next to the name fields — it is its own outlined act with a large target,
 * emphasised label and an error state, identical on desktop and at 390x844.
 *
 * Must be rendered inside an antd `<Form>` — field names, validation rules and
 * i18n keys are identical in every host.
 */
export const DpaFormSection = ({
    dpaHtml,
    textLabel,
    textDescription,
    accepted,
    acceptTouched,
    onAcceptedChange,
}: DpaFormSectionProps) => {
    const { t } = useTranslation();
    const showAcceptError = acceptTouched && !accepted;

    return (
        <>
            {dpaHtml && <DpaLegalReader html={dpaHtml} label={textLabel} description={textDescription} />}
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="signerName"
                    label={t('tenantOnboarding.dpa.signerName')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerPosition"
                    label={t('tenantOnboarding.dpa.signerPosition')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
                <MuiFormField
                    name="signerEmail"
                    label={t('tenantOnboarding.dpa.signerEmail')}
                    rules={[
                        { required: true, whitespace: true, message: t('tenantOnboarding.validation.required') },
                        { type: 'email', message: t('tenantOnboarding.validation.email') },
                    ]}
                />
                <MuiFormField
                    name="signerOrganisation"
                    label={t('tenantOnboarding.dpa.signerOrganisation')}
                    rules={[{ required: true, whitespace: true, message: t('tenantOnboarding.validation.required') }]}
                />
            </div>

            <div
                id={DPA_CONSENT_ANCHOR_ID}
                data-testid="dpa-consent"
                className={classNames(styles.consent, {
                    [styles.consentChecked]: accepted,
                    [styles.consentError]: showAcceptError,
                })}
            >
                <M3Checkbox
                    checked={accepted}
                    label={t('tenantOnboarding.dpa.accept')}
                    className={styles.consentCheckbox}
                    onChange={onAcceptedChange}
                />
                {/* The visible wording duplicates the checkbox's accessible
                    name, so it is hidden from assistive tech (announced once)
                    and only serves as a large pointer target. */}
                <div className={styles.consentBody} aria-hidden="true" onClick={() => onAcceptedChange(!accepted)}>
                    <Typography component="p" className={styles.consentTitle}>
                        {t('tenantOnboarding.dpa.accept')}
                    </Typography>
                    <Typography component="p" className={styles.consentHint}>
                        {t('tenantOnboarding.dpa.acceptHint')}
                    </Typography>
                </div>
            </div>
            {/* Field-level state only: short and unannounced. The sentence
                that tells the user what to DO lives next to the submit button
                the host renders (#594.6) — announcing both would say the same
                thing twice. */}
            {showAcceptError && (
                <FormHelperText
                    error
                    className={styles.consentErrorText}
                    data-testid="dpa-consent-error"
                    // MUI's default error red misses WCAG AA at 12px on the
                    // public page surface; the M3 error tone clears it (5:1).
                    // Scoped to `.Mui-error` so MUI's own rule does not win.
                    sx={{ '&.Mui-error': { color: 'var(--m3-error, #ba1a1a)' } }}
                >
                    {t('tenantOnboarding.dpa.acceptRequiredShort')}
                </FormHelperText>
            )}
        </>
    );
};
