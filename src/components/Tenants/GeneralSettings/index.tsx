import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useTranslation } from 'react-i18next';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { CardDeck } from '../../CardDeck';
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
import styles from './styles.module.scss';

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
    const { t } = useTranslation();
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
        <div className={styles.appearancePage}>
            <CardDeck
                className={styles.cardDeck}
                ariaLabel="Einstellungen scrollen"
                previousLabel="Vorherige Einstellungen anzeigen"
                nextLabel="Weitere Einstellungen anzeigen"
            >
                <CardDeck.Item className={styles.cardSlotImages}>
                    <LogoAndFavicon tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </CardDeck.Item>
                {can(PermissionAction.Update, Resource.Language) && (
                    <CardDeck.Item>
                        <Languages tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
                <CardDeck.Item className={styles.cardSlotTheme}>
                    <ThemeBuilder tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </CardDeck.Item>
                <CardDeck.Item>
                    <CardEditable
                        key={`tenant-master-data-editable-${appearanceEditable}`}
                        allowEdit={isSuperAdmin}
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
                </CardDeck.Item>
                <CardDeck.Item>
                    <NameAndSlogan tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </CardDeck.Item>
                {can(PermissionAction.Update, Resource.Language) && (
                    <CardDeck.Item>
                        <TypeOfLanguage tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
            </CardDeck>
        </div>
    );
};
