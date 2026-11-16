import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import {
    useAgencyContactCandidates,
    useAgencyContactPerson,
    useSaveAgencyContactPerson,
} from '../../../../../hooks/useContactPerson';
import type { AgencyContactPersonAdmin, ContactPersonUpdate } from '../../../../../types/contactPerson';
import { ContactPersonSettings } from './index';

interface AgencyContactPersonTileProps {
    agencyId: number;
    /** Tenant of the centre; sent along only for platform admins. */
    tenantId?: number | null;
}

const emptyData = (agencyId: number, tenantId?: number | null): AgencyContactPersonAdmin => ({
    agencyId,
    tenantId: tenantId ?? null,
    traegerDefault: {},
    effectiveSource: 'NONE',
});

/**
 * Loads and saves the tile "Ansprechperson" on the master-data tab of an
 * existing Beratungsstelle (ORISO-Admin#1534). Any admin who may open the
 * centre may set its contact person; the service enforces the scope.
 */
export const AgencyContactPersonTile = ({ agencyId, tenantId }: AgencyContactPersonTileProps) => {
    const { isSuperAdmin } = useUserRoles();
    const scopedTenant = isSuperAdmin ? tenantId : undefined;
    const { data, isLoading, isError } = useAgencyContactPerson(agencyId, scopedTenant);
    const { data: candidates, isLoading: candidatesLoading } = useAgencyContactCandidates(agencyId, scopedTenant);
    const { mutate } = useSaveAgencyContactPerson(agencyId, scopedTenant);

    const save = (update: ContactPersonUpdate, options?: { onError?: () => void }) =>
        mutate(update, { onError: () => options?.onError?.() });

    return (
        <ContactPersonSettings
            // Remount after a save so the form starts from the stored pair.
            key={`${data?.contact?.adminId ?? '-'}:${data?.deputy?.adminId ?? '-'}`}
            data={data ?? emptyData(agencyId, tenantId)}
            candidates={candidates ?? []}
            candidatesLoading={candidatesLoading}
            onSave={save}
            isLoading={isLoading}
            // Without the stored state a save could silently clear a contact the admin never saw.
            readOnlyAccess={isError}
        />
    );
};
