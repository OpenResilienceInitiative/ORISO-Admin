import { useParams } from 'react-router-dom';
import { LegalSettings } from '../../../../components/Tenants/LegalSettings';

export const SingleLegalSettings = () => {
    const { id } = useParams();

    return <LegalSettings tenantId={id} />;
};
