import { useParams } from 'react-router-dom';
import { BrandedEmailPreview } from '../../../../components/EmailPreview/BrandedEmailPreview';
import { SmtpSettings } from '../../../../components/Tenants/AppSettings/SmtpSettings';
import { SmtpSurface } from '../../../TenantSettings/UnifiedSmtpSettings';

/**
 * Email Server tab of a platform admin editing a Träger: the same page as the Träger admin's own
 * settings, with the Träger of the route as tenant.
 */
export const TenantSmtpSettings = () => {
    const { id } = useParams<{ id: string }>();
    const tenantId = Number(id);
    // `add` (or any non-id) is no Träger yet: no preview, so it never shows platform branding.
    const canPreview = Number.isInteger(tenantId) && tenantId > 0;

    return (
        <SmtpSurface>
            <SmtpSettings tenantId={id ?? ''} />
            {canPreview && <BrandedEmailPreview tenantId={tenantId} />}
        </SmtpSurface>
    );
};
