import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantIdentity } from './components/AssistantIdentity';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { CardGrid } from '../../CardGrid';
import { ReadOnlyHintContext } from '../../CardEditable/ReadOnlyHintContext';
import { useAppearanceEditingRights } from '../../../hooks/useAppearanceEditingRights.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { EditingRightsCard } from './components/EditingRightsCard';
import { Languages } from './components/Languages';
import { LogoAndFavicon } from './components/LogoAndFavicon';
import { NameAndSlogan } from './components/NameAndSlogan';
import { ThemeBuilder } from './components/ThemeBuilder';
import { TypeOfLanguage } from './components/TypeOfLanguage';
import { resolveTenantId } from '../../../utils/resolveTenantId';
import styles from './styles.module.scss';

/**
 * Which card group the page renders. The settings tab bar splits master data and appearance
 * into two tabs (Figma Admin.ORISO node 465-27854), so the page must be able to render either
 * half; `all` keeps the combined deck for embedders like the per-tenant theme-settings page.
 */
export type GeneralSettingsSection = 'all' | 'appearance' | 'masterData';

interface AppearanceSwitchFormData {
    tenantAdminControls?: { allowedPermissionToggles?: { appearance?: boolean } };
}

interface GeneralSettingsProps {
    tenantId?: string;
    section?: GeneralSettingsSection;
    /**
     * Tiles the embedding page puts first in the master data raster (`CardGrid.Item`s). The
     * platform admin's Träger edit page adds its Trägerinformationen card this way, so it sits in
     * the same raster as the tiles next to it instead of in a grid of its own.
     */
    leadingTiles?: ReactNode;
}

export const GeneralSettings = ({ tenantId, section = 'all', leadingTiles }: GeneralSettingsProps) => {
    const { t } = useTranslation();
    const { data } = useTenantData();
    const finalTenantId = resolveTenantId(tenantId, data?.id);
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const showAppearance = section === 'all' || section === 'appearance';
    const showMasterData = section === 'all' || section === 'masterData';
    const { editable, isLoading: rightsLoading, save } = useAppearanceEditingRights(finalTenantId);
    // An organisation admin edits only once the tenant service has said so: unknown counts as locked.
    const readOnly = !isSuperAdmin && editable !== true;
    const onSaveTenantAdminControls = (
        formData: Partial<AppearanceSwitchFormData>,
        options?: { onError?: () => void },
    ) => {
        save(formData.tenantAdminControls?.allowedPermissionToggles?.appearance !== false, options);
    };
    // A locked tile names who can release it: the platform admins' switch on the master data tab.
    const readOnlyHint = readOnly ? t('settings.masterData.editable.readOnlyHint') : undefined;
    return (
        <div className={styles.appearancePage}>
            <ReadOnlyHintContext.Provider value={readOnlyHint}>
                <CardGrid raster>
                    {showAppearance && (
                        <CardGrid.Item span={2}>
                            <LogoAndFavicon tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showAppearance && (
                        <CardGrid.Item>
                            <AssistantIdentity tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showAppearance && can(PermissionAction.Update, Resource.Language) && (
                        <CardGrid.Item>
                            <Languages tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showAppearance && (
                        <CardGrid.Item span={2}>
                            <ThemeBuilder tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showMasterData && leadingTiles}
                    {showMasterData && (
                        <CardGrid.Item>
                            <NameAndSlogan tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showMasterData && can(PermissionAction.Update, Resource.Language) && (
                        <CardGrid.Item>
                            <TypeOfLanguage tenantId={finalTenantId} readOnly={readOnly} />
                        </CardGrid.Item>
                    )}
                    {showMasterData && (
                        <CardGrid.Item>
                            <EditingRightsCard
                                allowEdit={isSuperAdmin && editable !== undefined}
                                readOnlyAccess={!isSuperAdmin}
                                editable={editable}
                                isLoading={rightsLoading}
                                onSave={onSaveTenantAdminControls}
                            />
                        </CardGrid.Item>
                    )}
                </CardGrid>
            </ReadOnlyHintContext.Provider>
        </div>
    );
};
