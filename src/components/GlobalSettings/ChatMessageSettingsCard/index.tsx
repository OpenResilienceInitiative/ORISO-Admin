import FormatSizeOutlinedIcon from '@mui/icons-material/FormatSizeOutlined';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../Snackbar';
import { CardEditable } from '../../CardEditable';
import { MuiNumberFormField } from '../../mui/MuiFormField';
import { MuiSwitchField } from '../../mui/MuiSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import {
    CHAT_COMPOSER_FORMAT_GROUPS,
    CHAT_COMPOSER_FORMATS,
    ChatComposerFormat,
    CHAT_COLLAPSE_THRESHOLD_LIMITS,
    CHAT_MAX_WIDTH_LIMITS,
    ChatMessageSettingsValues,
    parseChatMessageSettings,
} from './chatMessageSettings';
import styles from './styles.module.scss';

interface Props {
    /** As served by GET /service/settings: comma-separated keys; undefined means none disabled. */
    disabledFormats?: string | string[];
    maxWidth?: string | number;
    collapseThreshold?: string | number;
    isLoading: boolean;
    onSave: (values: ChatMessageSettingsValues, options?: { onError?: () => void }) => void;
    /** Superadmin-only settings are never hidden, only disabled. */
    disabled?: boolean;
}

interface FormValues {
    formats?: Partial<Record<ChatComposerFormat, boolean>>;
    maxWidth?: number;
    collapseEnabled?: boolean;
    collapseThreshold?: number;
}

/**
 * Platform-wide chat message settings: which formats the composer's formats menu offers, how wide
 * a message may grow on desktop, and when a long message collapses behind "show more". A format
 * that is switched off only disappears from composing; messages already sent keep it, and
 * switching it on again brings the button back at once.
 */
export const ChatMessageSettingsCard = ({
    disabledFormats,
    maxWidth,
    collapseThreshold,
    isLoading,
    onSave,
    disabled,
}: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<FormValues>();
    const current = parseChatMessageSettings({ disabledFormats, maxWidth, collapseThreshold });
    const collapseEnabled = Form.useWatch('collapseEnabled', form) ?? current.collapseThreshold > 0;

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<FormatSizeOutlinedIcon />}
            titleKey="globalSettings.chatMessages.title"
            subTitleKey="globalSettings.chatMessages.description"
            initialValues={{
                formats: Object.fromEntries(
                    CHAT_COMPOSER_FORMATS.map((format) => [format, !current.disabledFormats.includes(format)]),
                ),
                maxWidth: current.maxWidth,
                collapseEnabled: current.collapseThreshold > 0,
                collapseThreshold: current.collapseThreshold > 0 ? current.collapseThreshold : undefined,
            }}
            isLoading={isLoading}
            allowEdit={!isLoading && !disabled}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: FormValues, options) =>
                onSave(
                    {
                        disabledFormats: CHAT_COMPOSER_FORMATS.filter((format) => values.formats?.[format] === false),
                        maxWidth: values.maxWidth ?? current.maxWidth,
                        collapseThreshold: values.collapseEnabled
                            ? values.collapseThreshold ?? CHAT_COLLAPSE_THRESHOLD_LIMITS.default
                            : 0,
                    },
                    options,
                )
            }
        >
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{t('globalSettings.chatMessages.formats.title')}</h4>
                <p className={styles.sectionHelp}>{t('globalSettings.chatMessages.formats.help')}</p>
                {CHAT_COMPOSER_FORMAT_GROUPS.map(({ group, formats }) => (
                    <div key={group}>
                        <h5 className={styles.groupTitle}>{t(`globalSettings.chatMessages.group.${group}`)}</h5>
                        <div className={styles.formats}>
                            {formats.map((format) => (
                                <MuiSwitchField
                                    key={format}
                                    name={['formats', format]}
                                    label={t(`globalSettings.chatMessages.format.${format}`)}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{t('globalSettings.chatMessages.maxWidth.title')}</h4>
                <MuiNumberFormField
                    name="maxWidth"
                    label={t('globalSettings.chatMessages.maxWidth.label')}
                    helpText={t('globalSettings.chatMessages.maxWidth.help', CHAT_MAX_WIDTH_LIMITS)}
                    disabled={disabled}
                    min={CHAT_MAX_WIDTH_LIMITS.min}
                    inputProps={{ max: CHAT_MAX_WIDTH_LIMITS.max }}
                    rules={[
                        {
                            required: true,
                            type: 'integer',
                            min: CHAT_MAX_WIDTH_LIMITS.min,
                            max: CHAT_MAX_WIDTH_LIMITS.max,
                            message: t('globalSettings.chatMessages.maxWidth.invalid', CHAT_MAX_WIDTH_LIMITS),
                        },
                    ]}
                />
            </section>
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{t('globalSettings.chatMessages.collapse.title')}</h4>
                <MuiSwitchField
                    name="collapseEnabled"
                    label={t('globalSettings.chatMessages.collapse.switch')}
                    helpText={t('globalSettings.chatMessages.collapse.help')}
                    disabled={disabled}
                />
                {collapseEnabled && (
                    // The switch's help line sits right above; without room the field's floating label covers it.
                    <div className={styles.threshold}>
                        <MuiNumberFormField
                            name="collapseThreshold"
                            label={t('globalSettings.chatMessages.collapse.label')}
                            helpText={t(
                                'globalSettings.chatMessages.collapse.thresholdHelp',
                                CHAT_COLLAPSE_THRESHOLD_LIMITS,
                            )}
                            disabled={disabled}
                            min={CHAT_COLLAPSE_THRESHOLD_LIMITS.min}
                            inputProps={{ max: CHAT_COLLAPSE_THRESHOLD_LIMITS.max }}
                            rules={[
                                {
                                    required: true,
                                    type: 'integer',
                                    min: CHAT_COLLAPSE_THRESHOLD_LIMITS.min,
                                    max: CHAT_COLLAPSE_THRESHOLD_LIMITS.max,
                                    message: t(
                                        'globalSettings.chatMessages.collapse.invalid',
                                        CHAT_COLLAPSE_THRESHOLD_LIMITS,
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}
            </section>
        </CardEditable>
    );
};

export const ChatMessageSettingsCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { settings } = useAppConfigContext();
    const { mutate, isPending } = useSettingsAdminMutation();
    return (
        <ChatMessageSettingsCard
            disabledFormats={settings.chatComposerDisabledFormats}
            maxWidth={settings.chatMessageMaxWidthDesktop}
            collapseThreshold={settings.chatMessageCollapseThreshold}
            isLoading={isPending}
            disabled={!isSuperAdmin}
            onSave={(values, options) =>
                mutate(
                    {
                        chatComposerDisabledFormats: values.disabledFormats,
                        chatMessageMaxWidthDesktop: values.maxWidth,
                        chatMessageCollapseThreshold: values.collapseThreshold,
                    },
                    {
                        // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                        onError: () => {
                            snackbar.error({ content: t('globalSettings.chatMessages.error.generic') });
                            options?.onError?.();
                        },
                    },
                )
            }
        />
    );
};
