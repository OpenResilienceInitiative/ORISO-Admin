import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { MuiSwitchField } from '../../mui/MuiSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

interface Props {
    enabled?: boolean;
    isLoading: boolean;
    onSave: (enabled: boolean, options?: { onError?: () => void }) => void;
    /**
     * ORISO design rule: superadmin-only settings are never hidden, only disabled.
     * Pass true for everyone else — the card renders greyed out and read-only.
     */
    disabled?: boolean;
}

/**
 * ORISO-UserService#1264 (ADR-014 amendment 2026-09-25): platform-wide switch "one topic per
 * counselling centre". Default off; the data model stays multi-topic.
 */
export const OneTopicPerAgencySettingsCard = ({ enabled = false, isLoading, onSave, disabled }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<CategoryOutlinedIcon />}
            titleKey="globalSettings.oneTopicPerAgency.title"
            initialValues={{ oneTopicPerAgencyEnabled: enabled }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: { oneTopicPerAgencyEnabled?: boolean }, options) =>
                onSave(values.oneTopicPerAgencyEnabled === true, options)
            }
        >
            <MuiSwitchField
                name="oneTopicPerAgencyEnabled"
                label={t('globalSettings.oneTopicPerAgency.switch')}
                helpText={t('globalSettings.oneTopicPerAgency.help')}
            />
        </CardEditable>
    );
};

export const OneTopicPerAgencySettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <OneTopicPerAgencySettingsCard
            enabled={settings.oneTopicPerAgencyEnabled === true}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(oneTopicPerAgencyEnabled, options) =>
                mutate(
                    { oneTopicPerAgencyEnabled },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            message.error({
                                content: t('globalSettings.oneTopicPerAgency.error.generic'),
                                duration: 5,
                            });
                            options?.onError?.();
                        },
                    },
                )
            }
        />
    );
};
