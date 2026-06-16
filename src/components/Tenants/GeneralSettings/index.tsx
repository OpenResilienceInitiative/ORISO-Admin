import { Col, Row } from 'antd';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { CardEditable } from '../../CardEditable';
import { FormSwitchField } from '../../FormSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { Languages } from './components/Languages';
import { LogoAndFavicon } from './components/LogoAndFavicon';
import { NameAndSlogan } from './components/NameAndSlogan';
import { ThemeBuilder } from './components/ThemeBuilder';
import { TypeOfLanguage } from './components/TypeOfLanguage';
import { AppConfigInterface } from '../../../types/AppConfigInterface';

interface GeneralSettingsProps {
    tenantId?: string;
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

export const GeneralSettings = ({ tenantId }: GeneralSettingsProps) => {
    const { data } = useTenantData();
    const finalTenantId = tenantId || `${data?.id || ''}`;
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const { settings, setManualSettings } = useAppConfigContext();
    const { mutate: updateSettings } = useSettingsAdminMutation();
    const appearanceAllowed =
        settings.tenantAdminControls?.allowedPermissionToggles?.appearance ??
        data?.settings?.tenantAdminControls?.allowedPermissionToggles?.appearance ??
        getStoredAppearanceAllowed();
    const appearanceEditable = appearanceAllowed !== false;
    const tenantAdminControlsInitialValues = {
        tenantAdminControls: {
            allowedPermissionToggles: {
                appearance: appearanceEditable,
            },
        },
    };
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
        <Row gutter={[24, 24]}>
            <Col span={12} sm={6}>
                <CardEditable
                    key={`tenant-master-data-editable-${appearanceEditable}`}
                    allowEdit={isSuperAdmin}
                    initialValues={tenantAdminControlsInitialValues}
                    titleKey="settings.masterData.editable.title"
                    onSave={onSaveTenantAdminControls}
                >
                    <FormSwitchField
                        labelKey="settings.masterData.editable.toggle"
                        name={['tenantAdminControls', 'allowedPermissionToggles', 'appearance']}
                        inline
                        disableLabels
                        disabled={!isSuperAdmin}
                    />
                </CardEditable>
                <NameAndSlogan tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                {can(PermissionAction.Update, Resource.Language) && (
                    <>
                        <Languages tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                        <TypeOfLanguage tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </>
                )}
            </Col>
            <Col span={12} sm={6}>
                <LogoAndFavicon tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
            </Col>
            <Col span={24}>
                <ThemeBuilder tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
            </Col>
        </Row>
    );
};
