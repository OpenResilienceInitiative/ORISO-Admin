import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { snackbar } from '../components/Snackbar';
import { FETCH_ERRORS } from '../api/fetchData';
import { useTenantAdminControls } from './useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from './useTenantAdminControlsMutation.hook';
import { useTenantData } from './useTenantData.hook';
import { tenantPermissionPoliciesKey, useTenantPermissionPolicies } from './useTenantPermissionPolicies';
import { useUserRoles } from './useUserRoles.hook';
import { withStoredScopeOnly } from '../components/Tenants/AppSettings/PermissionsSettings/RecipientScope/recipientScopePolicy';

/** Key of the policy the tenant service reads when it checks the editing lock (ORISO-TenantService#345). */
const APPEARANCE_POLICY_KEY = 'appearance';

/**
 * Whether organisation admins may edit master data and appearance, kept in the tenant service only.
 *
 * Platform admins edit the platform value (`GET/PUT /tenantadmin/controls`). Everyone else sees what
 * the tenant service holds for their organisation (`GET /tenantadmin/{id}/permission-policies`), the
 * very value its server-side check uses. Nothing is kept in the browser.
 */
export const useAppearanceEditingRights = (tenantId: string) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { isSuperAdmin } = useUserRoles();
    const { data: ownTenantData } = useTenantData();
    const controls = useTenantAdminControls(isSuperAdmin);
    const tenantPolicies = useTenantPermissionPolicies(tenantId, !isSuperAdmin, { silent: true });
    const mutation = useTenantAdminControlsMutation({
        // The request helper already toasted an HTTP error; a second message would only repeat it.
        onError: (error) => {
            if (error instanceof Error && error.message === FETCH_ERRORS.CATCH_ALL) return;
            snackbar.error({ message: t('settings.masterData.editable.saveError') });
        },
        // Organisations read their own copy: do not let it show the old value until the next refetch.
        onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantPermissionPoliciesKey(tenantId) }),
    });

    // `undefined` means "not known": still loading, or the read failed. It is never shown or treated
    // as "editable" for an organisation admin, and a platform admin is not shown a switch position.
    const platformValue = controls.data
        ? controls.data.permissionPolicies?.[APPEARANCE_POLICY_KEY]?.value ??
          controls.data.allowedPermissionToggles?.appearance ??
          true
        : undefined;
    const organisationValue =
        tenantId && !tenantPolicies.isError
            ? tenantPolicies.data?.policies?.[APPEARANCE_POLICY_KEY]?.value ??
              (tenantPolicies.data
                  ? ownTenantData?.settings?.tenantAdminControls?.allowedPermissionToggles?.appearance
                  : undefined)
            : undefined;
    const editable = isSuperAdmin ? platformValue : organisationValue;
    const isLoading = isSuperAdmin ? controls.isLoading : Boolean(tenantId) && tenantPolicies.isLoading;

    const save = useCallback(
        (nextEditable: boolean, options?: { onError?: () => void }) => {
            const stored = controls.data;
            if (!stored) {
                // Without the stored controls a PUT would overwrite every other platform setting.
                snackbar.error({ message: t('settings.masterData.editable.saveError') });
                options?.onError?.();
                return;
            }
            mutation.mutate(
                withStoredScopeOnly({
                    ...stored,
                    allowedPermissionToggles: { ...stored.allowedPermissionToggles, appearance: nextEditable },
                    permissionPolicies: {
                        ...stored.permissionPolicies,
                        [APPEARANCE_POLICY_KEY]: { value: nextEditable, mode: 'ENFORCED' },
                    },
                }),
                { onError: options?.onError },
            );
        },
        [controls.data, mutation, t],
    );

    return { editable, isLoading, save };
};
