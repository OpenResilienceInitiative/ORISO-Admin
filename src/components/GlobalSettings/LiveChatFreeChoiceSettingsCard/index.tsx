import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../Snackbar';
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
 * ORISO-Admin#1497 (Frank 2026-11-18): platform-wide live-chat queue rule. Off (default) keeps the
 * strict order from ORISO-UserService#1595: only the longest-waiting guest can be accepted. On lets
 * counsellors accept any waiting guest; the list stays sorted longest-waiting first.
 */
export const LiveChatFreeChoiceSettingsCard = ({ enabled = false, isLoading, onSave, disabled }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<ForumOutlinedIcon />}
            titleKey="globalSettings.liveChatFreeChoice.title"
            initialValues={{ liveChatFreeChoiceEnabled: enabled }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            note={{ icon: <InfoOutlinedIcon />, text: t('globalSettings.liveChatFreeChoice.help') }}
            onSave={(values: { liveChatFreeChoiceEnabled?: boolean }, options) =>
                onSave(values.liveChatFreeChoiceEnabled === true, options)
            }
        >
            <MuiSwitchField name="liveChatFreeChoiceEnabled" label={t('globalSettings.liveChatFreeChoice.switch')} />
        </CardEditable>
    );
};

export const LiveChatFreeChoiceSettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <LiveChatFreeChoiceSettingsCard
            enabled={settings.liveChatFreeChoiceEnabled === true}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(liveChatFreeChoiceEnabled, options) =>
                mutate(
                    { liveChatFreeChoiceEnabled },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            snackbar.error({
                                content: t('globalSettings.liveChatFreeChoice.error.generic'),
                            });
                            options?.onError?.();
                        },
                    },
                )
            }
        />
    );
};
