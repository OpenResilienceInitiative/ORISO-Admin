import { LegalText, LegalTextComponentProps } from './index';
import { useTenantLegalProposalInbox } from '../../hooks/useLegalProposalInbox';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';

/**
 * The Träger's imprint / privacy card: receives platform templates (left/right compare) and
 * forwards its own draft to its Beratungsstellen (#1070). The inbox lives here, not in
 * `LegalText`, so the card stays usable without a query client in its own tests.
 */
export const TraegerLegalText = (props: LegalTextComponentProps) => {
    const { tenantId, legalType } = props;
    const { isTenantScopedAdmin } = useUserRoles();
    const inbox = useTenantLegalProposalInbox(tenantId, legalType === 'imprint' ? 'IMPRINT' : 'PRIVACY', !!legalType);
    return (
        <LegalText
            {...props}
            offerTemplatesToAgencies={isTenantScopedAdmin}
            templateCanManage={isTenantScopedAdmin}
            templateInbox={inbox}
        />
    );
};

export default TraegerLegalText;
