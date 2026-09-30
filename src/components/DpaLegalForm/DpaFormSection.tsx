import classNames from 'classnames';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';
import { useTranslation } from 'react-i18next';
import { M3Checkbox } from '../M3Checkbox';
import { MuiFormField } from '../mui/MuiFormField';
import type { DpaUnavailableReason } from '../../api/tenantOnboarding/tenantOnboarding';
import { DpaLegalReader } from './DpaLegalReader';
import styles from './styles.module.scss';

/**
 * What to tell the user when there is no agreement to show. The reasons have
 * opposite remedies — waiting for the operator to publish vs. telling the
 * operator their server is broken — so they must not share one sentence. The
 * generic fallback stays for everything the backend does not explain
 * (undefined from an older backend, or content that the sanitiser emptied).
 */
const UNAVAILABLE_MESSAGE_KEY: Record<DpaUnavailableReason, string> = {
    NOT_PUBLISHED: 'tenantOnboarding.dpa.unavailableNotPublished',
    UPSTREAM_ERROR: 'tenantOnboarding.dpa.unavailableUpstream',
};

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
    /**
     * Sanitized HTML of the published legal text (host applies DOMPurify +
     * language pick). EMPTY means the agreement is unavailable: the block then
     * renders the explanatory state only — no reader, no signer fields and no
     * consent control — so nothing can be confirmed that was never shown.
     */
    dpaHtml: string;
    /**
     * Backend's explanation for the empty `dpaHtml` (resolve response field
     * `dpaUnavailableReason`). Drives WHICH unavailable message is shown;
     * `null`/absent keeps the generic one. Ignored while an agreement is
     * rendered — the block only ever speaks about content it does not have.
     */
    unavailableReason?: DpaUnavailableReason | null;
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
    /**
     * Rendered between the agreement and the signer section — the slot the
     * onboarding wizard puts its "Stammdaten Organisation" block in, so the
     * organisation the contract is signed FOR stands directly above the person
     * signing it (owner report 2026-08-19). It is deliberately outside the
     * signer section: it belongs to the host, not to the signature.
     */
    beforeSignerFields?: React.ReactNode;
    /**
     * Heading level of the signer section header. The block must not skip a
     * level in its host's outline (WCAG 2.2 / axe `heading-order`): the DPA
     * blocker states its own h1 above it, the onboarding wizard an h2.
     */
    signerHeadingLevel?: 2 | 3;
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
    unavailableReason,
    textLabel,
    textDescription,
    hideTextHeader,
    textLanguage,
    beforeSignerFields,
    signerHeadingLevel = 2,
    accepted,
    acceptTouched,
    onAcceptedChange,
}: DpaFormSectionProps) => {
    const { t } = useTranslation();
    const SignerHeading = `h${signerHeadingLevel}` as const;
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
        // Say WHICH of the two failures happened. "Please reload the page"
        // is advice only for a transient glitch; for a server-side read
        // failure it is a lie that cost a staging afternoon, and for an
        // unpublished contract it points at the wrong person entirely.
        const messageKey = (unavailableReason && UNAVAILABLE_MESSAGE_KEY[unavailableReason]) ?? null;
        return (
            <>
                <Alert
                    severity="error"
                    role="alert"
                    data-testid="dpa-content-unavailable"
                    data-unavailable-reason={unavailableReason ?? undefined}
                    sx={{ mb: 2 }}
                >
                    {t(messageKey ?? 'tenantOnboarding.dpa.unavailable')}
                </Alert>
                {/* The host's own block is NOT part of the signature — it must
                    survive the withdrawn signing block, or the wizard would
                    lose its organisation fields with the agreement. */}
                {beforeSignerFields}
            </>
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
            {beforeSignerFields}
            {/* A real heading, not a styled div (WCAG 2.2): the block was an
                unnamed run of four inputs, and its labels had to spell out
                "der unterzeichnenden Person" one by one to say what the header
                now says once (owner report 2026-08-19). */}
            <SignerHeading className={styles.sectionTitle} data-testid="dpa-signer-section-title">
                {t('tenantOnboarding.dpa.signerSectionTitle')}
            </SignerHeading>
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
                    className={styles.consentCheckbox}
                    onChange={onAcceptedChange}
                />
                {/* The block is the pointer target. Only the TITLE is hidden
                    from assistive tech — it repeats the checkbox's accessible
                    name verbatim and would be announced twice. The complete
                    confirmation remains the checkbox's accessible name.

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
