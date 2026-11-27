import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MESSAGE_RETENTION_MODES,
    TEMPORARY_ACCOUNT_LIMITS,
    type TemporaryAccountSettings,
} from '../../../types/TemporaryAccountSettings';
import { CardGrid } from '../../CardGrid';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { CardEditable } from '../../CardEditable';
import { TileSections } from '../../TileSections';
import { MuiNumberFormField } from '../../mui/MuiFormField';
import { MuiSwitchField } from '../../mui/MuiSwitchField';
import { MuiRadioGroupField } from '../../mui/MuiRadioGroupField';
import { useTemporaryAccountSettings } from '../../../hooks/useTemporaryAccountSettings.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { guestAccountsHelp, temporaryMessagesHelp } from './help';
import styles from './styles.module.scss';
import { Notify } from '../../Notify';

type SaveOptions = { onError?: () => void };

export interface TemporaryAccountSettingsCardProps {
    data?: TemporaryAccountSettings;
    isLoading: boolean;
    isSaving: boolean;
    error?: unknown;
    onSave: (settings: TemporaryAccountSettings, options?: SaveOptions) => void;
}

type NumberField = keyof typeof TEMPORARY_ACCOUNT_LIMITS;

/**
 * Keeps the form on the confirmed server values while the card is not being edited, and records the
 * revision those values came from. A save sends that revision, so stale values end in a 409.
 */
const SyncConfirmedSettings = ({
    data,
    editing,
    onSynced,
}: {
    data?: TemporaryAccountSettings;
    editing: boolean;
    onSynced: (revision: number) => void;
}) => {
    const form = Form.useFormInstance();
    const syncedRevision = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!data || editing || syncedRevision.current === data.revision) return;
        form.setFieldsValue(data);
        syncedRevision.current = data.revision;
        onSynced(data.revision);
    }, [data, editing, form, onSynced]);
    return null;
};

const LifetimeField = ({ name }: { name: NumberField }) => {
    const { t } = useTranslation();
    const { min, max } = TEMPORARY_ACCOUNT_LIMITS[name];
    return (
        <div className={styles.field}>
            <label htmlFor={name}>
                {t(`globalSettings.temporaryAccounts.${name}`)}
                <span className={styles.requiredMark} aria-hidden="true">
                    {' *'}
                </span>
            </label>
            <MuiNumberFormField
                name={name}
                id={name}
                required
                min={min}
                inputProps={{ step: 1, max, 'aria-required': true }}
                rules={[
                    {
                        required: true,
                        type: 'integer',
                        min,
                        max,
                        message: t('globalSettings.temporaryAccounts.validation', { min, max }),
                    },
                ]}
            />
        </div>
    );
};

/**
 * ORISO-Admin#1241 card 1: how long temporary guest accounts live, and whether their password
 * field is shown. The account always gets a password (ADR-029 §3).
 */
export const TemporaryGuestAccountsSettingsCard = ({
    data,
    isLoading,
    isSaving,
    error,
    onSave,
}: TemporaryAccountSettingsCardProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const syncedRevision = useRef<number | undefined>(undefined);

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<HourglassEmptyOutlinedIcon />}
            help={guestAccountsHelp}
            note={{ icon: <GroupAddOutlinedIcon />, text: t('globalSettings.temporaryAccounts.newPeopleNotice') }}
            titleKey="globalSettings.temporaryAccounts.title"
            subTitleKey="globalSettings.temporaryAccounts.description"
            initialValues={data ? { ...data } : undefined}
            isLoading={isLoading || isSaving}
            allowEdit={Boolean(data) && !isLoading && !isSaving && !error}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: Partial<TemporaryAccountSettings>, options) => {
                if (
                    !data ||
                    values.callDeleteAfterMinutes === undefined ||
                    values.callMaxLifetimeHours === undefined ||
                    values.chatInactivityDays === undefined
                )
                    return;
                onSave(
                    {
                        ...data,
                        callDeleteAfterMinutes: values.callDeleteAfterMinutes,
                        callMaxLifetimeHours: values.callMaxLifetimeHours,
                        chatInactivityDays: values.chatInactivityDays,
                        hidePasswordField: values.hidePasswordField === true,
                        revision: syncedRevision.current ?? data.revision,
                    },
                    options,
                );
            }}
        >
            {({ editing }) => (
                <>
                    <SyncConfirmedSettings
                        data={data}
                        editing={editing}
                        onSynced={(revision) => {
                            syncedRevision.current = revision;
                        }}
                    />
                    {Boolean(error) && (
                        <Notify
                            retry
                            quietText={t('notify.tile.notLoaded')}
                            causeKey="globalSettings:load"
                            title={t('notify.title.globalSettings')}
                            severity="error"
                        >
                            {t('globalSettings.temporaryAccounts.error.load')}
                        </Notify>
                    )}
                    <TileSections>
                        <TileSections.Section id="guest-call" title={t('globalSettings.temporaryAccounts.call.title')}>
                            <LifetimeField name="callDeleteAfterMinutes" />
                            <LifetimeField name="callMaxLifetimeHours" />
                        </TileSections.Section>
                        <TileSections.Section
                            id="guest-chat"
                            title={t('globalSettings.temporaryAccounts.chat.title')}
                            note={t('globalSettings.temporaryAccounts.chat.hint')}
                        >
                            <LifetimeField name="chatInactivityDays" />
                        </TileSections.Section>
                        <TileSections.Section id="guest-password" title={t('tileHelp.guestAccounts.password.title')}>
                            <MuiSwitchField
                                name="hidePasswordField"
                                label={t('globalSettings.temporaryAccounts.hidePasswordField')}
                                helpText={t('globalSettings.temporaryAccounts.hidePasswordFieldHelp')}
                            />
                        </TileSections.Section>
                    </TileSections>
                </>
            )}
        </CardEditable>
    );
};

/** ORISO-Admin#1241 card 2: what happens to the messages of temporary accounts (ADR-029 §5). */
export const TemporaryMessagesSettingsCard = ({
    data,
    isLoading,
    isSaving,
    error,
    onSave,
}: TemporaryAccountSettingsCardProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const syncedRevision = useRef<number | undefined>(undefined);

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<ForumOutlinedIcon />}
            help={temporaryMessagesHelp}
            note={{ icon: <GroupAddOutlinedIcon />, text: t('globalSettings.temporaryAccounts.newPeopleNotice') }}
            titleKey="globalSettings.temporaryMessages.title"
            subTitleKey="globalSettings.temporaryMessages.description"
            initialValues={data ? { ...data } : undefined}
            isLoading={isLoading || isSaving}
            allowEdit={Boolean(data) && !isLoading && !isSaving && !error}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: Partial<TemporaryAccountSettings>, options) => {
                if (!data || !values.messageRetention) return;
                onSave(
                    {
                        ...data,
                        messageRetention: values.messageRetention,
                        revision: syncedRevision.current ?? data.revision,
                    },
                    options,
                );
            }}
        >
            {({ editing }) => (
                <>
                    <SyncConfirmedSettings
                        data={data}
                        editing={editing}
                        onSynced={(revision) => {
                            syncedRevision.current = revision;
                        }}
                    />
                    {Boolean(error) && (
                        <Notify
                            retry
                            quietText={t('notify.tile.notLoaded')}
                            causeKey="globalSettings:load"
                            title={t('notify.title.globalSettings')}
                            severity="error"
                        >
                            {t('globalSettings.temporaryAccounts.error.load')}
                        </Notify>
                    )}
                    <MuiRadioGroupField
                        name="messageRetention"
                        labelKey="globalSettings.temporaryMessages.label"
                        required
                        vertical
                    >
                        {MESSAGE_RETENTION_MODES.map((mode) => (
                            <MuiRadioGroupField.Radio key={mode} value={mode}>
                                {t(`globalSettings.temporaryMessages.mode.${mode}`)}
                            </MuiRadioGroupField.Radio>
                        ))}
                    </MuiRadioGroupField>
                </>
            )}
        </CardEditable>
    );
};

/** Both cards, platform admin only; they share one settings resource and its revision. */
export const TemporaryAccountSettingsCardsContainer = () => {
    const { isSuperAdmin } = useUserRoles();
    const settings = useTemporaryAccountSettings(isSuperAdmin);
    if (!isSuperAdmin) return null;
    const props: TemporaryAccountSettingsCardProps = {
        data: settings.data,
        isLoading: settings.isLoading,
        isSaving: settings.isSaving,
        error: settings.error,
        onSave: (values, options) =>
            settings.save(values, {
                onError: (failure) => {
                    if (failure instanceof Error && failure.message === FETCH_ERRORS.CONFLICT) return;
                    options?.onError?.();
                },
            }),
    };
    return (
        <>
            <CardGrid.Item span={2}>
                <TemporaryGuestAccountsSettingsCard {...props} />
            </CardGrid.Item>
            <CardGrid.Item>
                <TemporaryMessagesSettingsCard {...props} />
            </CardGrid.Item>
        </>
    );
};
