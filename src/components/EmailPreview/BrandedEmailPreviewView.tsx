import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import { ThemeProvider } from '@mui/material/styles';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { Card } from '../Card';
import { M3Button } from '../M3Button';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import type { InviteEmailPreviewDTO } from '../../api/accountInvites/accountInvites';
import type { EmailLogoFallbackReason } from './emailBrandingHint';
import { EmailPreviewFrame } from './EmailPreviewFrame';
import styles from './styles.module.scss';

export interface BrandedEmailPreviewViewProps {
    preview?: InviteEmailPreviewDTO | null;
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    /**
     * Why the mail shows the text wordmark instead of a logo, or `null` when a usable logo is
     * configured. `undefined` = not applicable (platform-branding preview, no tenant selected).
     */
    logoFallbackReason?: EmailLogoFallbackReason | null;
}

/**
 * Live preview of the branded invite mail on the e-mail settings page (ORISO-UserService#914).
 *
 * Presentational only — the markup comes from the backend preview endpoint and is rendered
 * verbatim inside {@link EmailPreviewFrame}. This component owns nothing but the surrounding
 * loading / error / branding-hint states.
 */
export const BrandedEmailPreviewView = ({
    preview,
    isLoading,
    isError,
    onRetry,
    logoFallbackReason,
}: BrandedEmailPreviewViewProps) => {
    const { t } = useTranslation();

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <Card
                className={styles.previewCard}
                variant="dialog"
                autoHeight
                headerIcon={<MarkEmailReadOutlinedIcon />}
                titleKey="tenants.appSettings.emailPreview.title"
                subTitleKey="tenants.appSettings.emailPreview.description"
                isLoading={isLoading}
                dataTestId="branded-email-preview"
            >
                <div className={styles.previewBody}>
                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <M3Button variant="text" onClick={onRetry}>
                                    {t('tenants.appSettings.emailPreview.retry')}
                                </M3Button>
                            }
                        >
                            {t('tenants.appSettings.emailPreview.error')}
                        </Alert>
                    )}

                    {!isError && !preview && (
                        <Alert severity="info">{t('tenants.appSettings.emailPreview.empty')}</Alert>
                    )}

                    {!isError && preview && (
                        <>
                            {logoFallbackReason && (
                                <Alert severity="info">
                                    {t(
                                        logoFallbackReason === 'LOGO_NOT_REMOTE'
                                            ? 'tenants.appSettings.emailPreview.branding.logoNotRemote'
                                            : 'tenants.appSettings.emailPreview.branding.noLogo',
                                    )}
                                </Alert>
                            )}

                            <dl className={styles.metaList}>
                                <dt>{t('tenants.appSettings.emailPreview.meta.subject')}</dt>
                                <dd>{preview.subject}</dd>
                                <dt>{t('tenants.appSettings.emailPreview.meta.sampleLink')}</dt>
                                <dd className={styles.metaUrl}>{preview.sampleAcceptUrl}</dd>
                            </dl>

                            <EmailPreviewFrame
                                dataTestId="branded-email-preview-frame"
                                html={preview.html}
                                title={t('tenants.appSettings.emailPreview.frameTitle')}
                            />

                            <p className={styles.footnote}>{t('tenants.appSettings.emailPreview.footnote')}</p>
                        </>
                    )}
                </div>
            </Card>
        </ThemeProvider>
    );
};
