import { UserRole } from '../../../../enums/UserRole';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import {
    useSaveTenantContactPerson,
    useTenantContactCandidates,
    useTenantContactPerson,
} from '../../../../hooks/useContactPerson';
import type { TenantContactPersonUpdate } from '../../../../types/contactPerson';
import { TraegerContactPersonCard } from './TraegerContactPersonCard';

/** Only platform and Träger admins set the default; a BST admin sees it read-only. */
export const canEditTraegerDefault = ({
    isSuperAdmin,
    hasRole,
}: Pick<ReturnType<typeof useUserRoles>, 'isSuperAdmin' | 'hasRole'>) =>
    isSuperAdmin || hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin]);

/** The Träger contact endpoints refuse restricted BST admins, so they do not see the tile. */
export const canSeeTraegerDefault = ({ hasRole }: Pick<ReturnType<typeof useUserRoles>, 'hasRole'>) =>
    !hasRole(UserRole.RestrictedAgencyAdmin) ||
    hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin, UserRole.AgencyAdmin]);

/**
 * Loads and saves the Träger default contact person on the master-data tab of a
 * Träger (ORISO-Admin#1534).
 */
export const TraegerContactPersonTile = ({ tenantId }: { tenantId: number }) => {
    const roles = useUserRoles();
    const canEdit = canEditTraegerDefault(roles);
    const canSee = canSeeTraegerDefault(roles);
    const { data, isLoading, isError } = useTenantContactPerson(tenantId, canSee);
    const { data: candidates, isLoading: candidatesLoading } = useTenantContactCandidates(tenantId, canEdit);
    const { mutate } = useSaveTenantContactPerson(tenantId);

    if (!canSee) return null;

    const save = (update: TenantContactPersonUpdate, options?: { onError?: () => void }) =>
        mutate(update, { onError: () => options?.onError?.() });

    return (
        <TraegerContactPersonCard
            key={`${data?.contact?.adminId ?? '-'}:${data?.deputy?.adminId ?? '-'}:${data?.generalContactEmail ?? ''}`}
            data={data ?? { tenantId }}
            candidates={candidates ?? []}
            candidatesLoading={candidatesLoading}
            onSave={save}
            isLoading={isLoading}
            // Without the stored state a save could clear a default nobody saw.
            readOnlyAccess={!canEdit || isError}
        />
    );
};
