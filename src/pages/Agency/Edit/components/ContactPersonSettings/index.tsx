import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { CardEditable } from '../../../../../components/CardEditable';
import { ContactPersonPickers, CONTACT_FIELD } from '../../../../../components/ContactPerson/ContactPersonPickers';
import { TraegerDefaultHint } from '../../../../../components/ContactPerson/ContactPersonHint';
import styles from '../../../../../components/ContactPerson/styles.module.scss';
import type { AgencyContactPersonAdmin, ContactAdmin, ContactPersonUpdate } from '../../../../../types/contactPerson';

export interface ContactPersonSettingsProps {
    data: AgencyContactPersonAdmin;
    /** BST admins of the centre plus the Träger admins of its tenant. */
    candidates: ContactAdmin[];
    candidatesLoading?: boolean;
    onSave?: (update: ContactPersonUpdate, options?: { onError?: () => void }) => void;
    /** Opens the tile in edit mode (centre create flow). */
    editMode?: boolean;
    readOnlyAccess?: boolean;
    /** The stored pair is still loading. */
    isLoading?: boolean;
    /** A save is in flight; its answer remounts the tile, so no new draft may start meanwhile. */
    saving?: boolean;
}

const ContactPersonTileBody = ({
    form,
    data,
    candidates,
    loading,
}: {
    form: Parameters<typeof ContactPersonPickers>[0]['form'];
    data: AgencyContactPersonAdmin;
    candidates: ContactAdmin[];
    loading?: boolean;
}) => {
    const { t } = useTranslation();
    const watched: string | null | undefined = Form.useWatch(CONTACT_FIELD, form);
    // useWatch is still undefined on the first render; the store already holds the initial value.
    const contactId = watched === undefined ? form?.getFieldValue(CONTACT_FIELD) : watched;

    return (
        <>
            <p className={styles.description}>{t('agency.edit.contactPerson.text')}</p>
            {!contactId && <TraegerDefaultHint traegerDefault={data.traegerDefault} />}
            <ContactPersonPickers
                form={form}
                candidates={candidates}
                current={[data.contact, data.deputy]}
                loading={loading}
            />
        </>
    );
};

/**
 * Tile "Ansprechperson" of a Beratungsstelle (ORISO-Admin#1534): its own contact
 * person and deputy. While none is set, the hint names the Träger default that
 * applies, or warns that counsellors only see the centre's admins.
 */
export const ContactPersonSettings = ({
    data,
    candidates,
    candidatesLoading,
    onSave,
    editMode,
    readOnlyAccess,
    isLoading,
    saving,
}: ContactPersonSettingsProps) => (
    <CardEditable
        allowUnsavedChanges
        allowEdit={!saving}
        isLoading={isLoading}
        titleKey="agency.edit.contactPerson.title"
        headerIcon={<SupportAgentOutlinedIcon />}
        variant="dialog"
        editButtonPlacement="footer"
        editMode={editMode}
        readOnlyAccess={readOnlyAccess}
        initialValues={{
            contactAdminId: data.contact?.adminId,
            deputyAdminId: data.deputy?.adminId,
        }}
        onSave={(formData, options) => {
            const values = formData as ContactPersonUpdate;
            onSave?.(
                {
                    contactAdminId: values.contactAdminId || null,
                    // No deputy without a contact: clearing the contact clears both.
                    deputyAdminId: values.contactAdminId ? values.deputyAdminId || null : null,
                },
                options,
            );
        }}
    >
        {({ form }) => (
            <ContactPersonTileBody form={form} data={data} candidates={candidates} loading={candidatesLoading} />
        )}
    </CardEditable>
);
