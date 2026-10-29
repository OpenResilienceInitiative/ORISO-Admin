import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { MuiFormField } from '../../mui/MuiFormField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

/** Same bound as the backend (`supportEmail` in ORISO-ConsultingTypeService) and RFC 5321 paths. */
export const SUPPORT_EMAIL_MAX_LENGTH = 254;

interface Props {
    /** Stored address; empty or undefined means "not configured". */
    value?: string;
    isLoading: boolean;
    /** Receives the trimmed address; an empty string clears the setting. */
    onSave: (supportEmail: string, options?: { onError?: () => void }) => void;
    /**
     * ORISO design rule: superadmin-only settings are never hidden, only disabled.
     * Pass true for everyone else — the card renders greyed out and read-only.
     */
    disabled?: boolean;
}

/**
 * ORISO-Frontend#1915 (feature #117): the fallback support address counsellors see when their
 * counselling centre has no admin reachable by chat. It is served unauthenticated with the other
 * app settings, so it must be a shared mailbox. Deliberately not the DPIA operator contact e-mail
 * (data protection), which answers a different question.
 */
export const SupportEmailSettingsCard = ({ value = '', isLoading, onSave, disabled }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<SupportAgentOutlinedIcon />}
            titleKey="globalSettings.supportEmail.title"
            subTitleKey="globalSettings.supportEmail.description"
            initialValues={{ supportEmail: value }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: { supportEmail?: string }, options) => onSave((values.supportEmail ?? '').trim(), options)}
        >
            <MuiFormField
                label={t('globalSettings.supportEmail.label')}
                name="supportEmail"
                type="email"
                autoComplete="off"
                helpText={t('globalSettings.supportEmail.help')}
                rules={[{ type: 'email', whitespace: false, message: t('message.error.email.incorrect') }]}
                inputProps={{ maxLength: SUPPORT_EMAIL_MAX_LENGTH }}
            />
        </CardEditable>
    );
};

export const SupportEmailSettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <SupportEmailSettingsCard
            value={settings.supportEmail}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(supportEmail, options) =>
                mutate(
                    { supportEmail },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            message.error({ content: t('globalSettings.supportEmail.error.generic'), duration: 5 });
                            options?.onError?.();
                        },
                    },
                )
            }
        />
    );
};
