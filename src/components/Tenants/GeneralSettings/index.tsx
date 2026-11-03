import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useTranslation } from 'react-i18next';
import { AssistantIdentity } from './components/AssistantIdentity';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { CardGrid } from '../../CardGrid';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppearanceEditingRights } from '../../../hooks/useAppearanceEditingRights.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
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
}

export const GeneralSettings = ({ tenantId, section = 'all' }: GeneralSettingsProps) => {
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
    const tenantAdminControlsInitialValues = {
        tenantAdminControls: {
            allowedPermissionToggles: {
                // Unknown stays unset, so the switch is not shown as on when the read failed.
                appearance: editable,
            },
        },
    };
    const onSaveTenantAdminControls = (
        formData: Partial<AppearanceSwitchFormData>,
        options?: { onError?: () => void },
    ) => {
        save(formData.tenantAdminControls?.allowedPermissionToggles?.appearance !== false, options);
    };
    return (
        <div className={styles.appearancePage}>
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
                        <CardEditable
                            key={`tenant-master-data-editable-${editable}`}
                            isLoading={rightsLoading}
                            allowEdit={isSuperAdmin && editable !== undefined}
                            initialValues={tenantAdminControlsInitialValues}
                            titleKey="settings.masterData.editable.title"
                            subTitle={t<string>('settings.masterData.editable.subtitle')}
                            onSave={onSaveTenantAdminControls}
                            variant="dialog"
                            editButtonPlacement="footer"
                            headerIcon={<ManageAccountsOutlinedIcon />}
                        >
                            <FormSwitchField
                                label={
                                    <span className={styles.masterDataToggleCopy}>
                                        <span className={styles.masterDataToggleTitle}>
                                            {t('settings.masterData.editable.toggle')}
                                        </span>
                                        <span className={styles.masterDataToggleDescription}>
                                            {t('settings.masterData.editable.toggle.description')}
                                        </span>
                                    </span>
                                }
                                name={['tenantAdminControls', 'allowedPermissionToggles', 'appearance']}
                                inline
                                disableLabels
                                disabled={!isSuperAdmin}
                                className={styles.masterDataToggle}
                                switchLabel={t('settings.masterData.editable.toggle')}
                                switchVariant="m3"
                            />
                        </CardEditable>
                    </CardGrid.Item>
                )}
            </CardGrid>
        </div>
    );
};
