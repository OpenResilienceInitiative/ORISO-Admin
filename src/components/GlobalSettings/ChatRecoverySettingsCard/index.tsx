import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { Alert } from '@mui/material';
import { Form } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatRecoverySettings } from '../../../types/ChatRecoverySettings';
import { CardEditable } from '../../CardEditable';
import { MuiSelectField } from '../../mui/MuiSelectField';
import styles from './styles.module.scss';

interface Props {
    data?: ChatRecoverySettings;
    isLoading: boolean;
    isSaving: boolean;
    error?: unknown;
    onSave: (settings: ChatRecoverySettings, options?: { onError?: () => void }) => void;
}

const SyncConfirmedSettings = ({ data, editing }: { data?: ChatRecoverySettings; editing: boolean }) => {
    const form = Form.useFormInstance();
    const syncedRevision = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!data || editing || syncedRevision.current === data.revision) return;
        form.setFieldsValue(data);
        syncedRevision.current = data.revision;
    }, [data, editing, form]);
    return null;
};

export const ChatRecoverySettingsCard = ({ data, isLoading, isSaving, error, onSave }: Props) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const options = useMemo(
        () => [
            { value: 'LOGIN_PASSWORD', label: t('globalSettings.chatRecovery.mode.loginPassword') },
            { value: 'RECOVERY_KEY', label: t('globalSettings.chatRecovery.mode.recoveryKey') },
        ],
        [t],
    );
    const handleSave = (values: Partial<ChatRecoverySettings>, saveOptions?: { onError?: () => void }) => {
        if (!data || !values.asker || !values.consultant) return;
        onSave({ asker: values.asker, consultant: values.consultant, revision: data.revision }, saveOptions);
    };

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<KeyOutlinedIcon />}
            titleKey="globalSettings.chatRecovery.title"
            subTitleKey="globalSettings.chatRecovery.description"
            initialValues={data ? { ...data } : undefined}
            isLoading={isLoading || isSaving}
            allowEdit={Boolean(data) && !isLoading && !isSaving}
            editButtonPlacement="footer"
            formProp={form}
            onSave={handleSave}
        >
            {({ editing }) => (
                <>
                    <SyncConfirmedSettings data={data} editing={editing} />
                    {error && <Alert severity="error">{t('globalSettings.chatRecovery.error.load')}</Alert>}
                    <div className={styles.fields}>
                        <MuiSelectField
                            name="asker"
                            label="globalSettings.chatRecovery.asker"
                            help="globalSettings.chatRecovery.newUsersHelp"
                            options={options}
                            required
                        />
                        <MuiSelectField
                            name="consultant"
                            label="globalSettings.chatRecovery.consultant"
                            help="globalSettings.chatRecovery.newUsersHelp"
                            options={options}
                            required
                        />
                    </div>
                    <p className={styles.scope}>{t('globalSettings.chatRecovery.allConversationTypes')}</p>
                </>
            )}
        </CardEditable>
    );
};
