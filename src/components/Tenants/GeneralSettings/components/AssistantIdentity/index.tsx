import { ConfigProvider, Form, Radio } from 'antd';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useTranslation } from 'react-i18next';
import { ReactComponent as DefaultRobot } from '../../../../../resources/img/assistant/default.svg';
import { CardEditable } from '../../../../CardEditable';
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
import styles from './styles.module.scss';

const presets = [
    ['default', DefaultRobot],
    ['robot-7341990', Robot1],
    ['robot-1184077', Robot2],
    ['robot-3548536', Robot3],
    ['robot-5475944', Robot4],
] as const;

const IconPicker = ({
    value,
    onChange,
    disabled,
}: {
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
}) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    return (
        <Radio.Group
            value={value?.startsWith('data:') ? undefined : value}
            onChange={(event) => onChange?.(event.target.value)}
            disabled={disabled || componentDisabled}
            className={styles.presets}
        >
            {presets.map(([id, Asset], index) => (
                <Radio key={id} value={id}>
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
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);
    const { data: inherited } = usePublicTenantData();
    const { settings } = useAppConfigContext();
    const locked =
        readOnly ||
        isReadOnlySetting(settings.serverSettingsMeta, [
            'theming.assistantName',
            'theming.assistantIcon',
            'appearance',
        ]);
    const initialValues = {
        ...data,
        theming: {
            ...data?.theming,
            assistantName: data?.theming?.assistantName || inherited?.theming?.assistantName || '',
            assistantIcon: data?.theming?.assistantIcon || inherited?.theming?.assistantIcon || 'default',
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
            onSave={mutate}
            variant="dialog"
            editButtonPlacement="footer"
            headerIcon={<SmartToyOutlinedIcon />}
        >
            <FormInputField
                name={['theming', 'assistantName']}
                labelKey="settings.assistant.name"
                maxLength={80}
                placeholder="Carimat"
                disabled={locked}
            />
            <Form.Item name={['theming', 'assistantIcon']} label={t('settings.assistant.icon')}>
                <IconPicker disabled={locked} />
            </Form.Item>
            <FormFileUploaderField
                name={['theming', 'assistantIcon']}
                labelKey="settings.assistant.upload"
                allowAssistantIcon
                disabled={locked}
                tooltip={t('settings.assistant.formats')}
            />
            <p>{t('settings.assistant.formats')}</p>
        </CardEditable>
    );
};
