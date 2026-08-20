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
import { resolveTenantId } from '../../../utils/resolveTenantId';
import { GoLiveStatus, GoLiveCondition } from '../../GoLiveStatus';
import { useTenantGoLiveConditions } from '../../../hooks/useTenantGoLiveConditions';
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
    const { t } = useTranslation();
    const { data } = useTenantData();
    const finalTenantId = resolveTenantId(tenantId, data?.id);
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const showAppearance = section === 'all' || section === 'appearance';
    const showMasterData = section === 'all' || section === 'masterData';
    const tenantGoLive = useTenantGoLiveConditions(Number(finalTenantId), showMasterData);
    const tenantGoLiveConditions: GoLiveCondition[] = (
        [
            { key: 'contract', met: tenantGoLive.contractSigned },
            { key: 'agency', met: tenantGoLive.hasAgency },
            { key: 'agencyLive', met: tenantGoLive.hasLiveAgency },
        ] as const
    ).map(({ key, met }) => ({ key, state: met ? 'met' : 'open', label: t(`tenants.goLive.condition.${key}`) }));
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
                ariaLabel={t('tenant.settings.cardDeck.ariaLabel')}
                previousLabel={t('tenant.settings.cardDeck.previous')}
                nextLabel={t('tenant.settings.cardDeck.next')}
            >
                {/* First rail position, surface-less: the Träger go-live chain scopes
                    the whole area instead of being one of its cards. No Träger switch —
                    going live happens on the Beratungsstelle. */}
                {showMasterData && (
                    <CardDeck.Item width="bare">
                        <GoLiveStatus
                            title={t('tenants.goLive.title')}
                            description={t('tenants.goLive.description')}
                            conditions={tenantGoLiveConditions}
                            isLoading={tenantGoLive.isLoading}
                        />
                    </CardDeck.Item>
                )}
                {showAppearance && (
                    <CardDeck.Item className={styles.cardSlotImages}>
                        <LogoAndFavicon tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
                {showAppearance && can(PermissionAction.Update, Resource.Language) && (
                    <CardDeck.Item>
                        <Languages tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
                {showAppearance && (
                    <CardDeck.Item className={styles.cardSlotTheme}>
                        <ThemeBuilder tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
                {showAppearance && (
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
                )}
                {showMasterData && (
                    <CardDeck.Item>
                        <NameAndSlogan tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
                {showMasterData && can(PermissionAction.Update, Resource.Language) && (
                    <CardDeck.Item>
                        <TypeOfLanguage tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </CardDeck.Item>
                )}
            </CardDeck>
        </div>
    );
};
