import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import { CardEditable } from '../../../CardEditable';
import { TileSections } from '../../../TileSections';
import { MuiNumberFormField } from '../../../mui/MuiFormField';
import { TraegerSenderFields } from '../../TraegerSenderFields';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { orisoMuiTheme } from '../../../../theme/orisoMuiTheme';
import type { TenantAdminData } from '../../../../types/TenantAdminData';
import styles from './styles.module.scss';

interface TraegerLicenceSenderSettingsProps {
    tenantId: string;
}

const SENDER_FIELDS = ['legalName', 'contactEmail', 'contactPhone'] as const;

const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

/**
 * Licence and sender block of a Träger, in the tab "Weitere" of the Träger page (Frank, 2026-11-20): they
 * go beyond master data, so they left the Stammdaten tile and have their own save here. The create dialog
 * still asks for both, since a new Träger needs a licence before counsellors can be created.
 *
 * The save sends only these fields; the shared settings mutation lays them over a fresh full read of the
 * Träger, so nothing else is touched. Only a platform admin changes the licence: TenantService refuses a
 * changed licence from a Träger admin (see `OwnTenantInformation`), so for them it is read-only and never
 * sent.
 */
export const TraegerLicenceSenderSettings = ({ tenantId }: TraegerLicenceSenderSettingsProps) => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({ id: tenantId, successMessageKey: 'tenants.message.update' });
    const requiredRule = { required: true, message: t('form.errors.required') };

    const initialValues = data
        ? {
              licensing: { allowedNumberOfUsers: data.licensing?.allowedNumberOfUsers },
              ...Object.fromEntries(SENDER_FIELDS.map((field) => [field, data[field]])),
          }
        : {};

    const handleSave = (formData: Record<string, unknown>, options?: { onError?: () => void }) => {
        const changes = Object.fromEntries(
            SENDER_FIELDS.filter((field) => field in formData).map((field) => [field, formData[field]]),
        ) as Partial<TenantAdminData>;
        if (isSuperAdmin && formData.licensing) {
            changes.licensing = formData.licensing as TenantAdminData['licensing'];
        }
        mutate(changes, { onError: options?.onError });
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardEditable
                isLoading={isLoading}
                initialValues={initialValues}
                titleKey="tenants.appSettings.licenceSender.title"
                onSave={handleSave as never}
                variant="dialog"
                editButtonPlacement="footer"
                className={styles.card}
            >
                <TileSections>
                    <TileSections.Section
                        id="traeger-licence"
                        title={t('tenants.form.section.licence')}
                        note={t(
                            isSuperAdmin
                                ? 'tenants.appSettings.licenceSender.licenceNote'
                                : 'tenants.appSettings.licenceSender.licenceReadOnly',
                        )}
                    >
                        <div className={styles.fields}>
                            <div className={styles.fieldGroup}>
                                <MuiNumberFormField
                                    name={['licensing', 'allowedNumberOfUsers']}
                                    label={t('tenants.add.form.allowedConsultantsLicense.placeholder')}
                                    required={isSuperAdmin}
                                    disabled={!isSuperAdmin}
                                    min={1}
                                    rules={isSuperAdmin ? [requiredRule] : undefined}
                                />
                            </div>
                        </div>
                    </TileSections.Section>
                    <TileSections.Section
                        id="traeger-sender"
                        title={t('tenants.form.section.sender')}
                        note={t('tenants.appSettings.licenceSender.senderNote')}
                    >
                        <div className={styles.fields}>
                            <TraegerSenderFields wrapField={wrapInFieldGroup} />
                        </div>
                    </TileSections.Section>
                </TileSections>
            </CardEditable>
        </ThemeProvider>
    );
};
