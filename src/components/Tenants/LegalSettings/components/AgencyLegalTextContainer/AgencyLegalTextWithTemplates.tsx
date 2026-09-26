import { AgencyLegalTextContainer, AgencyLegalTextContainerProps } from './index';
import { useAgencyLegalProposalInbox } from '../../hooks/useLegalProposalInbox';

/**
 * The Beratungsstelle's legal card with the templates its Träger forwarded (#1070). The inbox
 * lives here so the container keeps working without a query client in its own tests.
 */
export const AgencyLegalTextWithTemplates = (props: Omit<AgencyLegalTextContainerProps, 'templateInbox'>) => {
    const { agencyData, field } = props;
    const inbox = useAgencyLegalProposalInbox(
        Number(agencyData?.id),
        field === 'privacy' ? 'DPP' : 'IMPRINT',
        agencyData !== undefined,
    );
    return <AgencyLegalTextContainer {...props} templateInbox={inbox} />;
};

export default AgencyLegalTextWithTemplates;
