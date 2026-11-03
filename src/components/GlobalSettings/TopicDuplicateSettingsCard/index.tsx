import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { MuiRadioGroupField } from '../../mui/MuiRadioGroupField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { TOPIC_DUPLICATE_MODES, TopicDuplicateMode } from '../../../types/AppConfigInterface';
import styles from './styles.module.scss';

/** Only this mode is implemented; the others are reserved for ORISO-Frontend#1878. */
const AVAILABLE_MODES: TopicDuplicateMode[] = ['INFORM_EXISTING_COUNSELLOR_ONCE'];

interface Props {
    mode?: TopicDuplicateMode;
    isLoading: boolean;
    onSave: (mode: TopicDuplicateMode, options?: { onError?: () => void }) => void;
    /** Superadmin-only settings are never hidden, only disabled. */
    disabled?: boolean;
}

/** ORISO-Frontend#1876: what happens when an asker holds two accepted conversations on one topic. */
export const TopicDuplicateSettingsCard = ({
    mode = 'INFORM_EXISTING_COUNSELLOR_ONCE',
    isLoading,
    onSave,
    disabled,
}: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<ContentCopyOutlinedIcon />}
            titleKey="globalSettings.topicDuplicate.title"
            initialValues={{ topicDuplicateMode: mode }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: { topicDuplicateMode?: TopicDuplicateMode }, options) =>
                onSave(values.topicDuplicateMode ?? 'INFORM_EXISTING_COUNSELLOR_ONCE', options)
            }
        >
            <MuiRadioGroupField
                name="topicDuplicateMode"
                help="globalSettings.topicDuplicate.help"
                disabled={disabled}
                vertical
            >
                {TOPIC_DUPLICATE_MODES.map((value) => (
                    <MuiRadioGroupField.Radio key={value} value={value} disabled={!AVAILABLE_MODES.includes(value)}>
                        {t(`globalSettings.topicDuplicate.option.${value}`)}
                    </MuiRadioGroupField.Radio>
                ))}
            </MuiRadioGroupField>
        </CardEditable>
    );
};

export const TopicDuplicateSettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <TopicDuplicateSettingsCard
            mode={settings.topicDuplicateMode}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(topicDuplicateMode, options) =>
                mutate(
                    { topicDuplicateMode },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            message.error({
                                content: t('globalSettings.topicDuplicate.error.generic'),
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
