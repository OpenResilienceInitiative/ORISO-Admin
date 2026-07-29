import { GlobalSmtpSettingsPage } from '../../GlobalSettings';
import { SmtpSettingsPage } from '../SmtpSettings';
import { BrandedEmailPreview } from '../../../components/EmailPreview/BrandedEmailPreview';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

export const UnifiedSmtpSettingsPage = () => {
    const { isSuperAdmin, tenantId } = useUserRoles();
    const { data } = useTenantData();
    // A super admin configures the PLATFORM SMTP, so their preview shows platform branding
    // (no tenant id); a tenant admin previews their own tenant's branding — same resolution
    // as SmtpSettingsPage.
    const resolvedTenantId = isSuperAdmin ? null : (tenantId && tenantId > 0 ? tenantId : data?.id) ?? null;

    // `BrandedEmailPreview` reads "no tenant id" as "platform branding", which is only true for a
    // super admin. For everyone else an unresolved tenant means UNKNOWN scope — while
    // `useTenantData` is still loading, and after it degraded to its id-less fallback body. Showing
    // the platform mail there would tell a tenant admin their branding looks like something it does
    // not, so the panel is withheld until the scope is known.
    const canPreview = isSuperAdmin || resolvedTenantId != null;

    return (
        <div className={styles.smtpSurface}>
            {isSuperAdmin ? <GlobalSmtpSettingsPage /> : <SmtpSettingsPage />}
            {canPreview && <BrandedEmailPreview tenantId={resolvedTenantId ?? undefined} />}
        </div>
    );
};
