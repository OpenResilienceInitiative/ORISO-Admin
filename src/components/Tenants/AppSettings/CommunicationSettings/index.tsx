import { CardEditable } from '../../../CardEditable';
import { FormSwitchField } from '../../../FormSwitchField';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import styles from './styles.module.scss';

export const CommunicationSettings = ({ tenantId }: { tenantId: string }) => {
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="tenants.appSettings.communications.title"
            onSave={mutate}
        >
            <div className={styles.checkGroup}>
                <FormSwitchField
                    labelKey="tenants.appSettings.communications.video.title"
                    name={['settings', 'extendedSettings', 'isVideoCallAllowed']}
                    inline
                    disableLabels
                />
            </div>
            {/* Attachment upload moved to the per-chat-type media families on the
                permissions cards (ADR-015); the old inverted flag is retired. */}
        </CardEditable>
    );
};
