import { useTranslation } from 'react-i18next';
import { useInviteEmailPreview } from '../../hooks/useInviteEmailPreview.hook';
import { useSingleTenantData } from '../../hooks/useSingleTenantData';
import { normalizeLanguage } from '../../utils/language';
import { BrandedEmailPreviewView } from './BrandedEmailPreviewView';
import { resolveEmailLogoFallbackReason } from './emailBrandingHint';

export interface BrandedEmailPreviewProps {
    /** Preview this tenant's branding; omit for platform branding (super-admin view). */
    tenantId?: number;
}

/**
 * Container for the branded-mail preview on the e-mail settings page (ORISO-UserService#914).
 *
 * Only the frame wording is localisable (`de` | `en`); anything else the mail shows comes from the
 * backend's branding resolution, so the Admin passes the current UI language and nothing more.
 */
export const BrandedEmailPreview = ({ tenantId }: BrandedEmailPreviewProps) => {
    const { i18n } = useTranslation();
    const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language) === 'en' ? 'en' : 'de';

    const { data, isPending, isError, refetch } = useInviteEmailPreview({ tenantId, language });
    // Cached by `useSingleTenantData`'s query key — the SMTP form on the same page already loaded it.
    const { data: tenant } = useSingleTenantData({ id: tenantId ?? '', enabled: tenantId != null });

    // Only a tenant we actually loaded can be said to have no usable logo. While the lookup is in
    // flight or has failed the branding is UNKNOWN, and `undefined` (= no hint) is the only honest
    // answer — claiming "no logo" there would accuse the admin of a misconfiguration that may not
    // exist.
    const logoFallbackReason = tenantId == null || !tenant ? undefined : resolveEmailLogoFallbackReason(tenant.theming);

    return (
        <BrandedEmailPreviewView
            preview={data}
            isLoading={isPending}
            isError={isError}
            onRetry={() => {
                refetch();
            }}
            logoFallbackReason={logoFallbackReason}
        />
    );
};
