import { AssistantIdentity } from './components/AssistantIdentity';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { CardGrid } from '../../CardGrid';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { EditingRightsCard } from './components/EditingRightsCard';
import { Languages } from './components/Languages';
import { LogoAndFavicon } from './components/LogoAndFavicon';
import { NameAndSlogan } from './components/NameAndSlogan';
import { ThemeBuilder } from './components/ThemeBuilder';
import { TypeOfLanguage } from './components/TypeOfLanguage';
import { AppConfigInterface } from '../../../types/AppConfigInterface';
import { resolveTenantId } from '../../../utils/resolveTenantId';
import styles from './styles.module.scss';

/**
 * Which card group the page renders. The settings tab bar splits master data and appearance
 * into two tabs (Figma Admin.ORISO node 465-27854), so the page must be able to render either
 * half; `all` keeps the combined deck for embedders like the per-tenant theme-settings page.
 */
export type GeneralSettingsSection = 'all' | 'appearance' | 'masterData';

interface GeneralSettingsProps {
    tenantId?: string;
    section?: GeneralSettingsSection;
}

const APPEARANCE_ALLOWED_STORAGE_KEY = 'oriso:tenantAdminControls.allowedPermissionToggles.appearance';

const getStoredAppearanceAllowed = () => {
    try {
        const value = window.localStorage.getItem(APPEARANCE_ALLOWED_STORAGE_KEY);
        return value === null ? undefined : value === 'true';
    } catch {
        return undefined;
    }
};

const setStoredAppearanceAllowed = (value: boolean) => {
    try {
        window.localStorage.setItem(APPEARANCE_ALLOWED_STORAGE_KEY, `${value}`);
    } catch {
        // Local fallback is best-effort while the backend key is not deployed.
    }
};

export const GeneralSettings = ({ tenantId, section = 'all' }: GeneralSettingsProps) => {
    const { data } = useTenantData();
    const finalTenantId = resolveTenantId(tenantId, data?.id);
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const showAppearance = section === 'all' || section === 'appearance';
    const showMasterData = section === 'all' || section === 'masterData';
    const { settings, setManualSettings } = useAppConfigContext();
    const { mutate: updateSettings } = useSettingsAdminMutation();
    const appearanceAllowed =
        settings.tenantAdminControls?.allowedPermissionToggles?.appearance ??
        data?.settings?.tenantAdminControls?.allowedPermissionToggles?.appearance ??
        getStoredAppearanceAllowed();
    const appearanceEditable = appearanceAllowed !== false;
    const onSaveTenantAdminControls = (
        formData: Partial<AppConfigInterface>,
        options?: Parameters<typeof updateSettings>[1],
    ) => {
        const nextAppearance = formData.tenantAdminControls?.allowedPermissionToggles?.appearance !== false;
        setStoredAppearanceAllowed(nextAppearance);
        setManualSettings(formData);
        updateSettings(formData, options);
    };
    return (
        <div className={styles.appearancePage}>
            <CardGrid raster>
                {showAppearance && (
                    <CardGrid.Item span={2}>
                        <LogoAndFavicon tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showAppearance && (
                    <CardGrid.Item>
                        <AssistantIdentity tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showAppearance && can(PermissionAction.Update, Resource.Language) && (
                    <CardGrid.Item>
                        <Languages tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showAppearance && (
                    <CardGrid.Item span={2}>
                        <ThemeBuilder tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showMasterData && (
                    <CardGrid.Item>
                        <NameAndSlogan tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showMasterData && can(PermissionAction.Update, Resource.Language) && (
                    <CardGrid.Item>
                        <TypeOfLanguage tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardGrid.Item>
                )}
                {showMasterData && (
                    <CardGrid.Item>
                        <EditingRightsCard
                            allowEdit={isSuperAdmin}
                            editable={appearanceEditable}
                            onSave={onSaveTenantAdminControls}
                        />
                    </CardGrid.Item>
                )}
            </CardGrid>
        </div>
    );
};
