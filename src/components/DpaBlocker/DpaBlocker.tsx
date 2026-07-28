import { useEffect, useMemo, useState } from 'react';
import { Form, Spin } from 'antd';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import { M3Button } from '../M3Button';
import { M3Checkbox } from '../M3Checkbox';
import { MuiFormField } from '../mui/MuiFormField';
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
 * (no fixed height with hidden overflow) so the full DPA text plus form stay
 * usable at 390x844 while the app behind stays scroll-locked.
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
            return;
        }
        onSign?.({
            signerName: values.signerName.trim(),
            signerPosition: values.signerPosition.trim(),
            signerEmail: values.signerEmail.trim(),
            signerOrganisation: values.signerOrganisation.trim(),
            accepted: true,
            language: i18n.language,
        });
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
                <div className={styles.card}>
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
                            initialValues={{
                                signerName: '',
                                signerPosition: '',
                                signerEmail: '',
                                signerOrganisation: '',
                            }}
                        >
                            <div
                                className={styles.dpaText}
                                data-testid="dpa-text"
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{ __html: dpaHtml }}
                            />
                            <div className={styles.fieldStack}>
                                <MuiFormField
                                    name="signerName"
                                    label={t('tenantOnboarding.dpa.signerName')}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: t('tenantOnboarding.validation.required'),
                                        },
                                    ]}
                                />
                                <MuiFormField
                                    name="signerPosition"
                                    label={t('tenantOnboarding.dpa.signerPosition')}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: t('tenantOnboarding.validation.required'),
                                        },
                                    ]}
                                />
                                <MuiFormField
                                    name="signerEmail"
                                    label={t('tenantOnboarding.dpa.signerEmail')}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: t('tenantOnboarding.validation.required'),
                                        },
                                        { type: 'email', message: t('tenantOnboarding.validation.email') },
                                    ]}
                                />
                                <MuiFormField
                                    name="signerOrganisation"
                                    label={t('tenantOnboarding.dpa.signerOrganisation')}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: t('tenantOnboarding.validation.required'),
                                        },
                                    ]}
                                />
                            </div>

                            <div className={styles.acceptRow}>
                                <M3Checkbox
                                    checked={dpaAccepted}
                                    label={t('tenantOnboarding.dpa.accept')}
                                    onChange={(value) => {
                                        setDpaAccepted(value);
                                        setAcceptTouched(true);
                                    }}
                                />
                                <Typography
                                    component="span"
                                    className={styles.acceptLabel}
                                    onClick={() => {
                                        setDpaAccepted((value) => !value);
                                        setAcceptTouched(true);
                                    }}
                                >
                                    {t('tenantOnboarding.dpa.accept')}
                                </Typography>
                            </div>
                            {acceptTouched && !dpaAccepted && (
                                <Typography role="alert" color="error" variant="body2" sx={{ mt: 1 }}>
                                    {t('tenantOnboarding.dpa.acceptRequired')}
                                </Typography>
                            )}

                            {signFailed && (
                                <Alert severity="error" sx={{ mt: 2 }} role="alert">
                                    {t('dpaBlocker.sign.error')}
                                </Alert>
                            )}

                            <div className={styles.actions}>
                                <M3Button type="submit" variant="filled" block disabled={signPending}>
                                    {t('dpaBlocker.sign.submit')}
                                </M3Button>
                            </div>
                        </Form>
                    )}

                    <div className={styles.actions}>
                        <M3Button variant="outlined" onClick={onRetry} disabled={retryPending}>
                            {t('dpaBlocker.retry')}
                        </M3Button>
                        <M3Button variant="text" onClick={onLogout}>
                            {t('dpaBlocker.logout')}
                        </M3Button>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};
