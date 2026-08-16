import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { useDpiaMasterData } from '../../../hooks/useDpiaMasterData.hook';
import { useDpiaMasterDataMutation } from '../../../hooks/useDpiaMasterDataMutation.hook';
import { DocumentMasterDataCard } from '../DocumentMasterDataCard';
import { DpiaMasterData } from '../../../types/dpiaMasterData';

/**
 * Container for the document master data card: loads the platform DPIA operator master data
 * (the endpoint is superadmin-only) and wires the save mutation. For everyone else the card
 * renders visible-but-disabled and never calls the endpoint (ORISO rule).
 */
export const DocumentMasterDataCardContainer = () => {
    const { isSuperAdmin } = useUserRoles();
    const { data, isLoading } = useDpiaMasterData(isSuperAdmin);
    const { mutate, isPending } = useDpiaMasterDataMutation();

    const handleSave = (formData: DpiaMasterData) => mutate(formData);

    return (
        <DocumentMasterDataCard
            data={data}
            isLoading={isSuperAdmin && (isLoading || isPending)}
            onSave={handleSave}
            disabled={!isSuperAdmin}
        />
    );
};

export default DocumentMasterDataCardContainer;
