import classNames from 'classnames';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';
import { useTranslation } from 'react-i18next';
import { M3Checkbox } from '../M3Checkbox';
import { MuiFormField } from '../mui/MuiFormField';
import { DpaLegalReader } from './DpaLegalReader';
import styles from './styles.module.scss';

/** Wrapper id of the consent control — hosts jump here on an incomplete submit. */
export const DPA_CONSENT_ANCHOR_ID = 'dpa-consent';

/** Id of the sentence that explains what ticking the box actually does. */
const DPA_CONSENT_HINT_ID = 'dpa-consent-hint';

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
    /**
     * Sanitized HTML of the published legal text (host applies DOMPurify +
     * language pick). EMPTY means the agreement is unavailable: the block then
     * renders the explanatory state only — no reader, no signer fields and no
     * consent control — so nothing can be confirmed that was never shown.
     */
    dpaHtml: string;
    /** Accessible name / card title of the legal-text reader. */
    textLabel: string;
    /** Optional intro line shown in the reader's help-text block. */
    textDescription?: React.ReactNode;
    /**
     * Drops the reader card's own icon + title — for hosts that already state
     * the agreement's name above it (the DPA blocker, Figma 1611-27868).
     */
    hideTextHeader?: boolean;
    /** Language of the shown agreement — passed to the reader for hyphenation. */
    textLanguage?: string;
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
    hideTextHeader,
    textLanguage,
    accepted,
    acceptTouched,
    onAcceptedChange,
}: DpaFormSectionProps) => {
    const { t } = useTranslation();
    const showAcceptError = acceptTouched && !accepted;

    // No text, no consent. Confirming is a legal act ON THE AGREEMENT SHOWN
    // ABOVE, so when the published content is missing, empty for every
    // language or sanitised away, the whole signing block is withheld: the
    // consent control cannot be reached and `accepted: true` cannot be
    // produced. Warning the user and leaving the box tickable would have the
    // backend record acceptance of a contract that was never displayed — the
    // same class of defect as ORISO-UserService#914 (`dpaContent = null`).
    // The hosts additionally refuse to submit (see their `dpa` submit
    // blocker); this is the structural half of the guard, so the rule holds
    // for every surface that reuses the block.
    if (!dpaHtml) {
        return (
            <Alert severity="error" role="alert" data-testid="dpa-content-unavailable" sx={{ mb: 2 }}>
                {t('tenantOnboarding.dpa.unavailable')}
            </Alert>
        );
    }

    return (
        <>
            <DpaLegalReader
                html={dpaHtml}
                label={textLabel}
                description={textDescription}
                contentLanguage={textLanguage}
                hideHeader={hideTextHeader}
            />
            <div className={classNames(styles.fieldStack, styles.fieldStackPaired)}>
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
                {/* The organisation was asked for already — on the onboarding
                    step right above, and for an existing Träger the platform
                    knows it anyway. Asking a second time was pure retyping, so
                    the slot carries a free, optional note instead (owner call
                    2026-07-30). It still travels as `signerOrganisation`: that
                    is the append-only signature record's own field, and no
                    signature loses a column over a relabel. */}
                <MuiFormField name="signerOrganisation" label={t('tenantOnboarding.dpa.signerNote')} />
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
                    describedById={DPA_CONSENT_HINT_ID}
                    className={styles.consentCheckbox}
                    onChange={onAcceptedChange}
                />
                {/* The block is the pointer target. Only the TITLE is hidden
                    from assistive tech — it repeats the checkbox's accessible
                    name verbatim and would be announced twice. The hint says
                    something the name does not, so it stays exposed and is
                    wired to the box via `aria-describedby` (#596 review): a
                    binding consent must be understandable by ear as well.

                    `role="presentation"` on the wrapper, not `aria-hidden`:
                    the div is a redundant POINTER surface for the adjacent
                    checkbox, which already carries the keyboard path, and a
                    presentational generic container leaves its text content in
                    the accessibility tree. */}
                <div role="presentation" className={styles.consentBody} onClick={() => onAcceptedChange(!accepted)}>
                    {/* The emphasis must be declared through `sx` as well as
                        the class: MUI Typography's own emotion class beats a
                        plain CSS-module selector, so the class alone rendered
                        the legal act in flat body text (#594 review). */}
                    <Typography
                        component="p"
                        aria-hidden="true"
                        className={styles.consentTitle}
                        sx={{
                            m: 0,
                            color: 'var(--m3-on-surface)',
                            fontSize: 16,
                            fontWeight: 600,
                            lineHeight: '24px',
                        }}
                    >
                        {t('tenantOnboarding.dpa.accept')}
                    </Typography>
                    <Typography
                        component="p"
                        id={DPA_CONSENT_HINT_ID}
                        className={styles.consentHint}
                        sx={{
                            mt: '4px',
                            mb: 0,
                            color: 'var(--m3-on-surface-variant)',
                            fontSize: 13,
                            lineHeight: '18px',
                        }}
                    >
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
                    // public page surface; the ORISO error tone clears it.
                    // Scoped to `.Mui-error` so MUI's own rule does not win.
                    sx={{ '&.Mui-error': { color: 'var(--m3-error)' } }}
                >
                    {t('tenantOnboarding.dpa.acceptRequiredShort')}
                </FormHelperText>
            )}
        </>
    );
};
