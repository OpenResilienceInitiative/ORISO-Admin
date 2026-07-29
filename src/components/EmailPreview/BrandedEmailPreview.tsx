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

    return (
        <BrandedEmailPreviewView
            preview={data}
            isLoading={isPending}
            isError={isError}
            onRetry={() => {
                refetch();
            }}
            logoFallbackReason={tenantId == null ? undefined : resolveEmailLogoFallbackReason(tenant?.theming)}
        />
    );
};
