import { useCallback, useEffect, useRef, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { useTranslation } from 'react-i18next';
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
import styles from './styles.module.scss';

interface GeneralSettingsProps {
    tenantId?: string;
}

const APPEARANCE_ALLOWED_STORAGE_KEY = 'oriso:tenantAdminControls.allowedPermissionToggles.appearance';
const SCROLL_EPSILON = 8;

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
    const cardDeckRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({
        canScrollBackward: false,
        canScrollForward: false,
    });
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
    const updateScrollState = useCallback(() => {
        const cardDeck = cardDeckRef.current;

        if (!cardDeck) {
            return;
        }

        const maxScrollLeft = cardDeck.scrollWidth - cardDeck.clientWidth;
        setScrollState({
            canScrollBackward: cardDeck.scrollLeft > SCROLL_EPSILON,
            canScrollForward: cardDeck.scrollLeft < maxScrollLeft - SCROLL_EPSILON,
        });
    }, []);
    const scrollCards = (direction: -1 | 1) => {
        const cardDeck = cardDeckRef.current;

        if (!cardDeck) {
            return;
        }

        cardDeck.scrollBy({
            left: direction * Math.min(cardDeck.clientWidth * 0.86, 760),
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        const cardDeck = cardDeckRef.current;

        if (!cardDeck) {
            return undefined;
        }

        updateScrollState();
        const timeoutId = window.setTimeout(updateScrollState, 0);
        const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : undefined;

        resizeObserver?.observe(cardDeck);
        cardDeck.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            window.clearTimeout(timeoutId);
            resizeObserver?.disconnect();
            cardDeck.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [updateScrollState]);

    return (
        <div className={styles.appearancePage}>
            <div className={styles.cardDeck} ref={cardDeckRef}>
                <div className={`${styles.cardSlot} ${styles.cardSlotImages}`}>
                    <LogoAndFavicon tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </div>
                {can(PermissionAction.Update, Resource.Language) && (
                    <div className={styles.cardSlot}>
                        <Languages tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </div>
                )}
                <div className={`${styles.cardSlot} ${styles.cardSlotTheme}`}>
                    <ThemeBuilder tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </div>
                <div className={styles.cardSlot}>
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
                </div>
                <div className={styles.cardSlot}>
                    <NameAndSlogan tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                </div>
                {can(PermissionAction.Update, Resource.Language) && (
                    <div className={styles.cardSlot}>
                        <TypeOfLanguage tenantId={finalTenantId} readOnly={!isSuperAdmin && !appearanceEditable} />
                    </div>
                )}
            </div>
            <div className={styles.sideScrollerFooter} aria-label="Einstellungen scrollen">
                <button
                    className={`${styles.scrollButton} ${
                        scrollState.canScrollBackward ? styles.scrollButtonActive : ''
                    }`}
                    type="button"
                    aria-label="Vorherige Einstellungen anzeigen"
                    disabled={!scrollState.canScrollBackward}
                    onClick={() => scrollCards(-1)}
                >
                    <ArrowBackIcon />
                </button>
                <button
                    className={`${styles.scrollButton} ${
                        scrollState.canScrollForward ? styles.scrollButtonActive : ''
                    }`}
                    type="button"
                    aria-label="Weitere Einstellungen anzeigen"
                    disabled={!scrollState.canScrollForward}
                    onClick={() => scrollCards(1)}
                >
                    <ArrowForwardIcon />
                </button>
            </div>
        </div>
    );
};
