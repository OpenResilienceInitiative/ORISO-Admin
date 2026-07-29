import { useEffect, useMemo, useState } from 'react';
import { Form, Spin } from 'antd';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import DOMPurify from 'dompurify';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Draw from '@mui/icons-material/Draw';
import Logout from '@mui/icons-material/Logout';
import Refresh from '@mui/icons-material/Refresh';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { DpaFormSection, focusDpaConsent } from '../DpaLegalForm/DpaFormSection';
import { M3Button } from '../M3Button';
import { pickLegalContentLanguage } from '../Tenants/LegalSettings/utils/legalContentLanguages';
import { DpaBlockerReason } from '../../utils/dpaBlockerGate';
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

/**
 * Global non-bypassable DPA blocker (TEN-INV-U10, #572, parent #569).
 *
 * Rendered by `DpaBlockerGate` INSTEAD of the admin routes, so a direct URL
 * to any admin page renders this screen and no mutating UI action is
 * reachable. Only viewing/signing the existing DPA form, retrying the status
 * check and logging out are possible. The overlay is the scroll container
 * (no fixed height with hidden overflow) so the full form stays usable at
 * 390x844 while the app behind stays scroll-locked; since #594 the legal text
 * itself is the canonical read-only reader, which scrolls inside its own
 * capped region so its chapter chips never leave the screen.
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
        const first = errorFields[0]?.name;
        if (first) {
            form.scrollToField(first, { block: 'center' });
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
                    <Typography id={TITLE_ID} variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                        {t('dpaBlocker.title')}
                    </Typography>
                    <Typography sx={{ mb: 2 }} color="text.secondary">
                        {t(`dpaBlocker.intro.${reason}`)}
                    </Typography>

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
                </div>
            </div>
        </ThemeProvider>
    );
};
