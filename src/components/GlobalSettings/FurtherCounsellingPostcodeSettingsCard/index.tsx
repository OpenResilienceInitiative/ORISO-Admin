import PinDropOutlinedIcon from '@mui/icons-material/PinDropOutlined';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../CardEditable';
import { MuiRadioGroupField } from '../../mui/MuiRadioGroupField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { FURTHER_COUNSELLING_POSTCODE_MODES, FurtherCounsellingPostcodeMode } from '../../../types/AppConfigInterface';
import styles from './styles.module.scss';

interface Props {
    mode?: FurtherCounsellingPostcodeMode;
    isLoading: boolean;
    onSave: (mode: FurtherCounsellingPostcodeMode, options?: { onError?: () => void }) => void;
    /** Superadmin-only settings are never hidden, only disabled. */
    disabled?: boolean;
}

/** ORISO-Frontend#1876: postcode prefill in the further-counselling request dialog. */
export const FurtherCounsellingPostcodeSettingsCard = ({ mode = 'SMART', isLoading, onSave, disabled }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<PinDropOutlinedIcon />}
            titleKey="globalSettings.furtherCounsellingPostcode.title"
            initialValues={{ furtherCounsellingPostcodeMode: mode }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: { furtherCounsellingPostcodeMode?: FurtherCounsellingPostcodeMode }, options) =>
                onSave(values.furtherCounsellingPostcodeMode ?? 'SMART', options)
            }
        >
            <MuiRadioGroupField
                name="furtherCounsellingPostcodeMode"
                help="globalSettings.furtherCounsellingPostcode.help"
                disabled={disabled}
                vertical
            >
                {FURTHER_COUNSELLING_POSTCODE_MODES.map((value) => (
                    <MuiRadioGroupField.Radio key={value} value={value}>
                        {t(`globalSettings.furtherCounsellingPostcode.option.${value}`)}
                    </MuiRadioGroupField.Radio>
                ))}
            </MuiRadioGroupField>
        </CardEditable>
    );
};

export const FurtherCounsellingPostcodeSettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <FurtherCounsellingPostcodeSettingsCard
            mode={settings.furtherCounsellingPostcodeMode}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(furtherCounsellingPostcodeMode, options) =>
                mutate(
                    { furtherCounsellingPostcodeMode },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            message.error({
                                content: t('globalSettings.furtherCounsellingPostcode.error.generic'),
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
