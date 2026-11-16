import { useTranslation } from 'react-i18next';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { CardEditable } from '../../../../components/CardEditable';
import { MuiFormField } from '../../../../components/mui/MuiFormField';
import { fieldIcon } from '../../../../components/AddressFields';
import { ContactPersonPickers } from '../../../../components/ContactPerson/ContactPersonPickers';
import styles from '../../../../components/ContactPerson/styles.module.scss';
import type { ContactAdmin, TenantContactPerson, TenantContactPersonUpdate } from '../../../../types/contactPerson';

export interface TraegerContactPersonCardProps {
    data: TenantContactPerson;
    /** All admins of the Träger. */
    candidates: ContactAdmin[];
    candidatesLoading?: boolean;
    onSave?: (update: TenantContactPersonUpdate, options?: { onError?: () => void }) => void;
    editMode?: boolean;
    /** BST admins see the Träger default but cannot set it. */
    readOnlyAccess?: boolean;
}

/**
 * Tile "Standard-Ansprechperson für alle Beratungsstellen" of a Träger
 * (ORISO-Admin#1534): applies to every centre that names no own contact person.
 * Also holds the Träger's general contact e-mail shown to counsellors.
 */
export const TraegerContactPersonCard = ({
    data,
    candidates,
    candidatesLoading,
    onSave,
    editMode,
    readOnlyAccess,
}: TraegerContactPersonCardProps) => {
    const { t } = useTranslation();

    return (
        <CardEditable
            allowUnsavedChanges
            titleKey="tenants.contactPerson.title"
            headerIcon={<SupportAgentOutlinedIcon />}
            variant="dialog"
            editButtonPlacement="footer"
            editMode={editMode}
            readOnlyAccess={readOnlyAccess}
            initialValues={{
                contactAdminId: data.contact?.adminId,
                deputyAdminId: data.deputy?.adminId,
                generalContactEmail: data.generalContactEmail ?? '',
            }}
            onSave={(formData, options) => {
                const values = formData as TenantContactPersonUpdate;
                onSave?.(
                    {
                        contactAdminId: values.contactAdminId || null,
                        deputyAdminId: values.contactAdminId ? values.deputyAdminId || null : null,
                        generalContactEmail: values.generalContactEmail?.trim() || null,
                    },
                    options,
                );
            }}
        >
            {({ form }) => (
                <>
                    <p className={styles.description}>{t('tenants.contactPerson.text')}</p>
                    <ContactPersonPickers
                        form={form}
                        candidates={candidates}
                        current={[data.contact, data.deputy]}
                        loading={candidatesLoading}
                    />
                    <MuiFormField
                        name="generalContactEmail"
                        type="email"
                        label={t('tenants.contactPerson.generalContactEmail')}
                        placeholder={t('tenants.contactPerson.generalContactEmail.placeholder')}
                        helpText={t('tenants.contactPerson.generalContactEmail.help')}
                        startAdornment={fieldIcon(<EmailOutlinedIcon fontSize="small" />)}
                        inputProps={{ maxLength: 255 }}
                        rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                    />
                </>
            )}
        </CardEditable>
    );
};
