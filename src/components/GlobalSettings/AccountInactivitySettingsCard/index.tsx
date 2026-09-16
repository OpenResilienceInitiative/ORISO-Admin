import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import Alert from '@mui/material/Alert';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccountInactivitySettings } from '../../../types/AccountInactivitySettings';
import { CardEditable } from '../../CardEditable';
import { MuiNumberFormField } from '../../mui/MuiFormField';
import { useAccountInactivitySettings } from '../../../hooks/useAccountInactivitySettings.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

interface Props {
    data?: AccountInactivitySettings;
    isLoading: boolean;
    isSaving: boolean;
    error?: unknown;
    onSave: (settings: AccountInactivitySettings, options?: { onError?: () => void }) => void;
}

const SyncConfirmedSettings = ({ data, editing }: { data?: AccountInactivitySettings; editing: boolean }) => {
    const form = Form.useFormInstance();
    const syncedRevision = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!data || editing || syncedRevision.current === data.revision) return;
        form.setFieldsValue(data);
        syncedRevision.current = data.revision;
    }, [data, editing, form]);
    return null;
};

export const AccountInactivitySettingsCard = ({ data, isLoading, isSaving, error, onSave }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<PersonOffOutlinedIcon />}
            titleKey="globalSettings.accountInactivity.title"
            subTitleKey="globalSettings.accountInactivity.description"
            initialValues={data ? { ...data } : undefined}
            isLoading={isLoading || isSaving}
            allowEdit={Boolean(data) && !isLoading && !isSaving}
            editButtonPlacement="footer"
            formProp={form}
            onSave={(values: Partial<AccountInactivitySettings>, options) => {
                if (
                    !data ||
                    values.askerMonths === undefined ||
                    values.consultantMonths === undefined ||
                    values.otherMonths === undefined
                )
                    return;
                onSave(
                    {
                        askerMonths: values.askerMonths,
                        consultantMonths: values.consultantMonths,
                        otherMonths: values.otherMonths,
                        revision: data.revision,
                    },
                    options,
                );
            }}
        >
            {({ editing }) => (
                <>
                    <SyncConfirmedSettings data={data} editing={editing} />
                    {error && <Alert severity="error">{t('globalSettings.accountInactivity.error.load')}</Alert>}
                    <div className={styles.fields}>
                        {(['askerMonths', 'consultantMonths', 'otherMonths'] as const).map((name) => (
                            <MuiNumberFormField
                                key={name}
                                name={name}
                                label={t(`globalSettings.accountInactivity.${name}`)}
                                helpText={
                                    name === 'otherMonths' ? t('globalSettings.accountInactivity.otherHelp') : undefined
                                }
                                required
                                min={1}
                                inputProps={{ step: 1, max: 2147483647 }}
                                rules={[
                                    {
                                        required: true,
                                        type: 'integer',
                                        min: 1,
                                        max: 2147483647,
                                        message: t('globalSettings.accountInactivity.validation'),
                                    },
                                ]}
                            />
                        ))}
                    </div>
                    <p className={styles.scope}>{t('globalSettings.accountInactivity.newPeopleNotice')}</p>
                </>
            )}
        </CardEditable>
    );
};

export const AccountInactivitySettingsCardContainer = () => {
    const { isSuperAdmin } = useUserRoles();
    const settings = useAccountInactivitySettings(isSuperAdmin);
    if (!isSuperAdmin) return null;
    return (
        <AccountInactivitySettingsCard
            data={settings.data}
            isLoading={settings.isLoading}
            isSaving={settings.isSaving}
            error={settings.error}
            onSave={(values, options) => settings.save(values, { onError: options?.onError })}
        />
    );
};
