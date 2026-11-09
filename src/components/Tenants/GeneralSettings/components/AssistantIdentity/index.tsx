import { Alert, ConfigProvider, Form, Radio } from 'antd';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useTranslation } from 'react-i18next';
import { ReactComponent as DefaultRobot } from '../../../../../resources/img/assistant/default.svg';
import { CardEditable } from '../../../../CardEditable';
import { TileSections } from '../../../../TileSections';
import { assistantHelp } from './help';
import { FormInputField } from '../../../../FormInputField';
import { FormFileUploaderField } from '../../../../FormFileUploaderField';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { usePublicTenantData } from '../../../../../hooks/usePublicTenantData.hook';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { isReadOnlySetting } from '../../../../../utils/serverSettingsMeta';
import { ReactComponent as Robot1 } from '../../../../../resources/img/assistant/robot-7341990-400.svg';
import { ReactComponent as Robot2 } from '../../../../../resources/img/assistant/robot-1184077-400.svg';
import { ReactComponent as Robot3 } from '../../../../../resources/img/assistant/robot-3548536-400.svg';
import { ReactComponent as Robot4 } from '../../../../../resources/img/assistant/robot-5475944-400.svg';
import { assistantIconUploadPolicy } from '../../../../../utils/assistantIconUploadPolicy';
import styles from './styles.module.scss';

const presets = [
    ['default', DefaultRobot],
    ['robot-7341990', Robot1],
    ['robot-1184077', Robot2],
    ['robot-3548536', Robot3],
    ['robot-5475944', Robot4],
] as const;

/**
 * antd renders the group as a plain div and its typings omit `role`, but it passes the attribute on. Without the
 * role the group's label would not be announced.
 */
const RADIO_GROUP_ROLE = { role: 'radiogroup' } as const;

/** What "Übernehmen" would show: the icon of the level above, once the read for this tenant has answered. */
const InheritedIcon = ({ icon }: { icon?: string }) => {
    const { t } = useTranslation();
    if (icon === undefined) return <AccountTreeOutlinedIcon aria-hidden="true" />;
    if (assistantIconUploadPolicy.canPreview(icon)) {
        return <img src={icon} alt={t('settings.assistant.inheritedIcon')} />;
    }
    const Preset = presets.find(([id]) => id === icon)?.[1] ?? DefaultRobot;
    return <Preset aria-label={t('settings.assistant.inheritedIcon')} role="img" />;
};

/**
 * The icon choices as tiles (#1374): "Übernehmen" first, then the presets. Still one radio group, so
 * arrow keys, labels and the saved value stay as they were; an own upload selects no tile.
 */
const IconPicker = ({
    value,
    onChange,
    disabled,
    inheritedIcon,
    label,
}: {
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    /** Names the group for screen readers; the section title above it says the same in words. */
    label?: string;
    /** `undefined` while the level above is not known. */
    inheritedIcon?: string;
}) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    return (
        <Radio.Group
            value={value?.startsWith('data:') ? undefined : value ?? ''}
            onChange={(event) => onChange?.(event.target.value)}
            disabled={disabled || componentDisabled}
            className={styles.presets}
            {...RADIO_GROUP_ROLE}
            aria-label={label}
        >
            <Radio value="" className={styles.presetTile}>
                <span className={styles.preset}>
                    <InheritedIcon icon={inheritedIcon} />
                    <span>{t('settings.assistant.inheritShort')}</span>
                </span>
            </Radio>
            {presets.map(([id, Asset], index) => (
                <Radio key={id} value={id} className={styles.presetTile}>
                    <span className={styles.preset}>
                        <Asset aria-hidden="true" />
                        <span>
                            {index === 0
                                ? t('settings.assistant.default')
                                : `${t('settings.assistant.robot')} ${index}`}
                        </span>
                    </span>
                </Radio>
            ))}
        </Radio.Group>
    );
};

export const AssistantIdentity = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const { data, isLoading, isError, mutate } = useTenantAppearanceFormData(tenantId, { ownOverrides: true });
    const { data: effective, isFetching: effectiveReadPending } = usePublicTenantData(tenantId);
    const inherited =
        !effectiveReadPending && Number(tenantId) > 0 && String(effective?.id) === tenantId ? effective : undefined;
    const { settings } = useAppConfigContext();
    const ownName = data?.theming?.assistantName;
    const ownIcon = data?.theming?.assistantIcon;
    const hasOwnName = !!ownName?.trim();
    const hasOwnIcon = !!ownIcon?.trim();
    const inheritedIcon = inherited ? inherited.theming?.assistantIcon || 'default' : undefined;
    const locked =
        readOnly ||
        isError ||
        !data ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'theming.assistantName',
            'theming.assistantIcon',
            'appearance',
        ]);
    const initialValues = {
        ...data,
        theming: {
            ...data?.theming,
            assistantName: hasOwnName ? ownName : '',
            assistantIcon: hasOwnIcon ? ownIcon : undefined,
        },
    };
    return (
        <CardEditable
            key={`assistant-${tenantId}-${initialValues.theming.assistantName}-${initialValues.theming.assistantIcon}-${locked}`}
            titleKey="settings.assistant.title"
            subTitle={t('settings.assistant.description')}
            initialValues={initialValues}
            isLoading={isLoading}
            allowEdit={!locked}
            readOnlyAccess={readOnly}
            onSave={(submitted, options) => {
                const values = submitted as { theming: { assistantName?: string; assistantIcon?: string } };
                const theming: { assistantName?: string | null; assistantIcon?: string | null } = {};
                (['assistantName', 'assistantIcon'] as const).forEach((field) => {
                    const next = values.theming[field];
                    if (next !== initialValues.theming[field]) theming[field] = next?.trim() || null;
                });
                mutate({ theming }, options);
            }}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<SmartToyOutlinedIcon />}
            help={assistantHelp}
        >
            {isError && <Alert type="error" message={t('settings.assistant.loadError')} showIcon />}
            <TileSections>
                <TileSections.Section id="assistant-name" title={t('settings.assistant.section.name')}>
                    <FormInputField
                        name={['theming', 'assistantName']}
                        labelKey="settings.assistant.name"
                        maxLength={80}
                        disabled={locked}
                    />
                    {!hasOwnName && (
                        <p className={styles.sectionText}>
                            {inherited
                                ? t('settings.assistant.inheritedName', {
                                      name: inherited.theming?.assistantName || 'Carimat',
                                  })
                                : t('settings.assistant.inheritedNameUnknown')}
                        </p>
                    )}
                </TileSections.Section>
                <TileSections.Section id="assistant-icon" title={t('settings.assistant.section.icon')}>
                    <Form.Item name={['theming', 'assistantIcon']} className={styles.iconPicker}>
                        <IconPicker
                            disabled={locked}
                            inheritedIcon={inheritedIcon}
                            label={t('settings.assistant.icon')}
                        />
                    </Form.Item>
                </TileSections.Section>
                <TileSections.Section id="assistant-upload" title={t('settings.assistant.section.upload')}>
                    <FormFileUploaderField
                        name={['theming', 'assistantIcon']}
                        uploadPolicy={assistantIconUploadPolicy}
                        disabled={locked}
                        row={{
                            title: t('settings.assistant.section.upload'),
                            description: t('settings.assistant.formats'),
                            inSection: true,
                        }}
                    />
                </TileSections.Section>
            </TileSections>
        </CardEditable>
    );
};
