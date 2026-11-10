import { ReactNode, useEffect, useRef } from 'react';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { useForm } from 'antd/lib/form/Form';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { CardEditable } from '../../CardEditable';
import { MuiFormField, MuiMultilineFormField } from '../../mui/MuiFormField';
import { TraegerSenderFields } from '../TraegerSenderFields';
import { TraegerDpoFields } from '../TraegerDpoFields';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useTenantAdminDataMutation } from '../../../hooks/useTenantAdminDataMutation.hook';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TenantAdminData } from '../../../types/TenantAdminData';
import { TenantData } from '../../../types/tenant';
import styles from './styles.module.scss';

const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

/**
 * The Träger information of the signed-in Träger: name, address, sender block, description and data
 * protection officer (ORISO-Admin#1466). Until now only the platform admin's Träger page showed it, so
 * a Träger admin had nowhere to look.
 *
 * Product decision (Frank, 2026-11-09): the Träger admins of this Träger, and platform admins, may
 * change it. TenantService already allows exactly that: `PUT /tenantadmin/{id}` needs the update
 * authority and the tenant id in the token must equal the id in the path. It refuses a changed
 * subdomain or licence number, so those are neither shown nor sent. Saving writes only this card's
 * fields onto a fresh full read of the Träger (the shared mutation of the other settings tiles), so
 * nothing else on the record is touched. The name is edited in the Name & Slogan tile and stays
 * read-only here, otherwise a save from this card could undo a rename.
 */
const CARD_FIELDS = [
    'address',
    'description',
    'legalName',
    'contactEmail',
    'contactPhone',
    'dataProtectionOfficer',
] as const;

const SHOWN_FIELDS = ['name', ...CARD_FIELDS] as const;

/**
 * CardEditable seeds its form from `initialValues` once, so late-arriving or refetched tenant data is
 * pushed in here, and only the fields this card shows. A refetch that lands while the card is open is
 * skipped so it cannot overwrite what the user is typing; Cancel resets the form to the latest data.
 * Closing the card alone never re-seeds, so a failed save still reopens with the entered values.
 */
const SyncFormWithData = ({ data, form, editing }: { data?: TenantData; form: FormInstance; editing: boolean }) => {
    const editingRef = useRef(editing);
    editingRef.current = editing;
    useEffect(() => {
        if (data && !editingRef.current) {
            form.setFieldsValue(
                Object.fromEntries(SHOWN_FIELDS.filter((field) => field in data).map((field) => [field, data[field]])),
            );
        }
    }, [data, form]);
    return null;
};

export const OwnTenantInformation = () => {
    const { data, isLoading } = useTenantData();
    const [form] = useForm();
    const { can } = useUserPermissions();
    const tenantId = data?.id != null ? String(data.id) : '';
    // The save reads the Träger fresh itself; no need to fetch it again when the card opens.
    const { mutate } = useTenantAdminDataMutation({ id: tenantId, prefetchTenantAdminData: false });

    const { t } = useTranslation();
    const allowEdit = tenantId !== '' && can(PermissionAction.Update, Resource.Tenant);

    const handleSave = (formData: Record<string, unknown>, options?: { onError?: () => void }) => {
        const changes = Object.fromEntries(
            CARD_FIELDS.filter((field) => field in formData).map((field) => [field, formData[field]]),
        ) as Partial<TenantAdminData>;
        mutate(changes, { onError: options?.onError });
    };

    return (
        <CardEditable
            isLoading={isLoading}
            allowEdit={allowEdit}
            editMode={false}
            titleKey="tenants.add.mainTenantTitle"
            headerIcon={<BusinessOutlinedIcon />}
            variant="dialog"
            editButtonPlacement="footer"
            initialValues={data ? (data as unknown as Record<string, unknown>) : {}}
            formProp={form}
            onSave={handleSave as never}
            className={styles.card}
        >
            {({ editing }) => [
                <SyncFormWithData key="sync" data={data} form={form} editing={editing} />,
                <div key="name" className={styles.fieldGroup}>
                    <MuiFormField name="name" label={t('tenants.add.form.name.placeholder')} disabled />
                </div>,
                <div key="address" className={styles.fieldGroup}>
                    <MuiFormField
                        name="address"
                        label={t('tenants.add.form.address.label')}
                        placeholder={t('tenants.add.form.address.placeholder')}
                    />
                </div>,
                <TraegerSenderFields key="sender" wrapField={wrapInFieldGroup} />,
                <div key="description" className={styles.fieldGroup}>
                    <MuiMultilineFormField
                        name="description"
                        label={t('tenants.add.form.description.label')}
                        placeholder={t('tenants.add.form.description.placeholder')}
                    />
                </div>,
                <TraegerDpoFields key="dpo" wrapField={wrapInFieldGroup} />,
            ]}
        </CardEditable>
    );
};
