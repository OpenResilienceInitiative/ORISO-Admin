import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { Card } from '../../../../../components/Card';
import {
    CONTACT_FIELD,
    DEPUTY_FIELD,
    ContactPersonPickers,
} from '../../../../../components/ContactPerson/ContactPersonPickers';
import { TraegerDefaultHint } from '../../../../../components/ContactPerson/ContactPersonHint';
import styles from '../../../../../components/ContactPerson/styles.module.scss';
import { resolveAgencyTenantId } from '../../../../../api/agency/addAgencyData';
import { useTenantContactCandidates, useTenantContactPerson } from '../../../../../hooks/useContactPerson';
import type { ContactPersonUpdate } from '../../../../../types/contactPerson';
import { parseUserAuthInfo } from '../../../../../utils/parseUserAuthInfo';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { canEditTraegerDefault } from '../../../../Tenants/Edit/General/TraegerContactPersonTile';

/**
 * The pair chosen in the create form, or `null` when none was chosen. The new
 * centre has no admins yet, so the candidates are the admins of its Träger; the
 * pair is saved once the centre exists (ORISO-Admin#1534).
 */
export const contactPersonFromCreateForm = (formData: Record<string, unknown>): ContactPersonUpdate | null => {
    const contactAdminId = (formData[CONTACT_FIELD] as string | null | undefined) || null;
    if (!contactAdminId) return null;
    return { contactAdminId, deputyAdminId: (formData[DEPUTY_FIELD] as string | null | undefined) || null };
};

/** Card "Ansprechperson" inside the create form of a Beratungsstelle; shares the outer form. */
export const ContactPersonCreateCard = () => {
    const { t } = useTranslation();
    const form = Form.useFormInstance();
    const selectedTenantId = Form.useWatch('tenantId', form);
    const tenantId = resolveAgencyTenantId(selectedTenantId, parseUserAuthInfo().tenantId);
    // The Träger endpoints serve platform and Träger admins only (not restricted BST admins).
    const mayReadTraeger = canEditTraegerDefault(useUserRoles());
    const { data: traeger } = useTenantContactPerson(tenantId, mayReadTraeger);
    const { data: candidates, isLoading } = useTenantContactCandidates(tenantId, mayReadTraeger);
    const contactId = Form.useWatch(CONTACT_FIELD, form);

    // Hidden rather than empty: without the Träger list there is nobody to pick.
    if (!mayReadTraeger) return null;

    return (
        <Card titleKey="agency.edit.contactPerson.title" headerIcon={<SupportAgentOutlinedIcon />} variant="dialog">
            <p className={styles.description}>{t('agency.edit.contactPerson.text')}</p>
            {!contactId && traeger && <TraegerDefaultHint traegerDefault={traeger} />}
            <ContactPersonPickers form={form} candidates={candidates ?? []} loading={isLoading} disabled={!tenantId} />
        </Card>
    );
};
