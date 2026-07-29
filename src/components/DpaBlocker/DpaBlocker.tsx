import { useEffect, useMemo, useState } from 'react';
import { Form, Spin } from 'antd';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import DOMPurify from 'dompurify';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Draw from '@mui/icons-material/Draw';
import Logout from '@mui/icons-material/Logout';
import Refresh from '@mui/icons-material/Refresh';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaIcon } from '../CustomIcons/LegalIcons';
import { DpaFormSection, focusDpaConsent } from '../DpaLegalForm/DpaFormSection';
import { M3Button } from '../M3Button';
import { pickLegalContentLanguage } from '../Tenants/LegalSettings/utils/legalContentLanguages';
import { DpaBlockerReason } from '../../utils/dpaBlockerGate';
import { focusFirstInvalidField } from '../../utils/formErrorNavigation';
import styles from './styles.module.scss';

export interface DpaBlockerSignData {
    signerName: string;
    signerPosition: string;
    signerEmail: string;
    signerOrganisation: string;
    accepted: true;
    language: string;
}

export interface DpaBlockerProps {
    reason: DpaBlockerReason;
    /** Whether the current state can be resolved by signing (UNSIGNED/OUTDATED). */
    signable: boolean;
    /** Published multilingual DPA content (JSON map language -> HTML) to review. */
    dpaContent?: string | null;
    dpaContentLoading?: boolean;
    signPending?: boolean;
    signFailed?: boolean;
    onSign?: (data: DpaBlockerSignData) => void;
    onRetry: () => void;
    retryPending?: boolean;
    onLogout: () => void;
}

interface DpaBlockerFormValues {
    signerName: string;
    signerPosition: string;
    signerEmail: string;
    signerOrganisation: string;
}

const TITLE_ID = 'dpa-blocker-title';

/** Namespaces the bound controls' ids — see the same constant in OrganisationDpaStep. */
const FORM_NAME = 'dpaBlocker';

/**
 * Global non-bypassable DPA blocker (TEN-INV-U10, #572, parent #569).
 *
 * Rendered by `DpaBlockerGate` INSTEAD of the admin routes, so a direct URL
 * to any admin page renders this screen and no mutating UI action is
 * reachable. Only viewing/signing the existing DPA form, retrying the status
 * check and logging out are possible.
 *
 * Scrolling (#572 acceptance, revisited in #594.3): there is exactly ONE
 * scroller. Below 1200px it is the overlay, so the whole form stays usable at
 * 390x844 while the app behind is scroll-locked; from 1200px up the card is
 * bounded to the viewport and its body scrolls instead, which is what lets it
 * be genuinely centred. The canonical reader inside brings no scroll container
 * of its own — its chapter chips stay reachable by sticking to the bottom of
 * whichever scrollport is active.
 */
export const DpaBlocker = ({
    reason,
    signable,
    dpaContent = null,
    dpaContentLoading = false,
    signPending = false,
    signFailed = false,
    onSign,
    onRetry,
    retryPending = false,
    onLogout,
}: DpaBlockerProps) => {
    const { t, i18n } = useTranslation();
    const [form] = Form.useForm<DpaBlockerFormValues>();
    const [dpaAccepted, setDpaAccepted] = useState(false);
    const [acceptTouched, setAcceptTouched] = useState(false);
    // Why the last submit did not go through — surfaced AT the button (#594.6).
    const [submitBlocker, setSubmitBlocker] = useState<'fields' | 'consent' | null>(null);

    // Scroll-lock the app behind the overlay for as long as the blocker exists.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const dpaHtml = useMemo(
        () => (dpaContent ? DOMPurify.sanitize(pickLegalContentLanguage(dpaContent, i18n.language)) : ''),
        [dpaContent, i18n.language],
    );

    const onFinish = (values: DpaBlockerFormValues) => {
        if (!dpaAccepted) {
            setAcceptTouched(true);
            setSubmitBlocker('consent');
            focusDpaConsent();
            return;
        }
        setSubmitBlocker(null);
        onSign?.({
            signerName: values.signerName.trim(),
            signerPosition: values.signerPosition.trim(),
            signerEmail: values.signerEmail.trim(),
            signerOrganisation: values.signerOrganisation.trim(),
            accepted: true,
            language: i18n.language,
        });
    };

    const onFinishFailed = ({ errorFields }: ValidateErrorEntity<DpaBlockerFormValues>) => {
        setAcceptTouched(true);
        setSubmitBlocker('fields');
        // Actually move the viewport AND the caret to what is missing. antd's
        // own `scrollToField` silently did nothing here (#594.6 review).
        if (!focusFirstInvalidField(errorFields, FORM_NAME) && !dpaAccepted) {
            focusDpaConsent();
        }
    };

    const showSignForm = signable && !dpaContentLoading && !!dpaHtml;
    const showContentUnavailable = signable && !dpaContentLoading && !dpaHtml;

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div
                className={styles.overlay}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITLE_ID}
                data-testid="dpa-blocker"
            >
                <div className={classNames(styles.card, { [styles.cardWide]: showSignForm })}>
                    {/* The body is the ONLY scroller from the desktop
                        breakpoint up, which is what lets the card be bounded
                        and genuinely centred; the exits below stay in view. */}
                    <div className={styles.cardBody}>
                        {/* One heading for the screen, centred above the text it
                            names (Figma 1611-27868). The reader card below runs
                            with `hideTextHeader`, so the agreement's name is
                            stated once instead of twice. */}
                        {/* Plain h1/p, not MUI Typography: Typography's emotion
                            class beats a CSS-module selector, so the sizes here
                            would silently fall back to body text (the same trap
                            documented in DpaFormSection). */}
                        <div className={styles.hero}>
                            <DpaIcon className={styles.heroIcon} />
                            <h1 id={TITLE_ID} className={styles.heroTitle}>
                                {t('dpaBlocker.title')}
                            </h1>
                            <p className={styles.heroIntro}>{t(`dpaBlocker.intro.${reason}`)}</p>
                        </div>

                        {signable && dpaContentLoading && (
                            <div className={styles.loading} data-testid="dpa-blocker-content-loading">
                                <Spin />
                            </div>
                        )}

                        {showContentUnavailable && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {t('dpaBlocker.contentUnavailable')}
                            </Alert>
                        )}

                        {showSignForm && (
                            <Form
                                form={form}
                                name={FORM_NAME}
                                layout="vertical"
                                requiredMark={false}
                                onFinish={onFinish}
                                onFinishFailed={onFinishFailed}
                                onValuesChange={() => setSubmitBlocker(null)}
                                initialValues={{
                                    signerName: '',
                                    signerPosition: '',
                                    signerEmail: '',
                                    signerOrganisation: '',
                                }}
                            >
                                <DpaFormSection
                                    dpaHtml={dpaHtml}
                                    hideTextHeader
                                    textLabel={t('dpaBlocker.title')}
                                    accepted={dpaAccepted}
                                    acceptTouched={acceptTouched}
                                    onAcceptedChange={(value) => {
                                        setDpaAccepted(value);
                                        setAcceptTouched(true);
                                        if (value) setSubmitBlocker(null);
                                    }}
                                />

                                {signFailed && (
                                    <Alert severity="error" sx={{ mt: 2 }} role="alert">
                                        {t('dpaBlocker.sign.error')}
                                    </Alert>
                                )}

                                {submitBlocker && (
                                    <Alert
                                        severity="error"
                                        role="alert"
                                        data-testid="dpa-blocker-submit-error"
                                        sx={{ mt: 2 }}
                                    >
                                        {t(
                                            submitBlocker === 'consent'
                                                ? 'tenantOnboarding.dpa.acceptRequired'
                                                : 'tenantOnboarding.validation.incomplete',
                                        )}
                                    </Alert>
                                )}

                                <div className={styles.actions}>
                                    <M3Button
                                        type="submit"
                                        variant="filled"
                                        block
                                        disabled={signPending}
                                        icon={<Draw fontSize="small" />}
                                    >
                                        {t('dpaBlocker.sign.submit')}
                                    </M3Button>
                                </div>
                            </Form>
                        )}
                    </div>

                    {/* Two exits, each with a purpose the reader can see
                        (#594.10). "Already signed?" is the reason this screen
                        is not a dead end: the authorised signatory may sign
                        through the DPA forwarding link, and the blocked admin
                        must be able to pick that up without logging out and
                        back in. "Log out" is the way off the screen. The
                        sentence below says both in plain words — an action
                        that cannot be explained does not stay. */}
                    <div className={styles.actions}>
                        <M3Button
                            variant="outlined"
                            onClick={onRetry}
                            disabled={retryPending}
                            icon={<Refresh fontSize="small" />}
                        >
                            {t('dpaBlocker.retry')}
                        </M3Button>
                        <M3Button variant="text" onClick={onLogout} icon={<Logout fontSize="small" />}>
                            {t('dpaBlocker.logout')}
                        </M3Button>
                    </div>
                    <p className={styles.actionsHint} data-testid="dpa-blocker-actions-hint">
                        {t('dpaBlocker.actionsHint')}
                    </p>
                </div>
            </div>
        </ThemeProvider>
    );
};
