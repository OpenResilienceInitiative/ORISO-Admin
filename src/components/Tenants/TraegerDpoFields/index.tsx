import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MuiFormField } from '../../mui/MuiFormField';
import styles from './styles.module.scss';

interface TraegerDpoFieldsProps {
    /** Wraps each field, so hosts keep their own spacing (`fieldGroup` on Allgemein). */
    wrapField?: (field: ReactNode, name: string) => ReactNode;
}

const FIELDS = [
    { key: 'nameAndLegalForm', label: 'agency.edit.settings.legal.contact.name', maxLength: 255 },
    { key: 'street', label: 'agency.edit.general.address.street', maxLength: 100 },
    { key: 'postcode', label: 'agency.edit.settings.legal.contact.postcode', maxLength: 10 },
    { key: 'city', label: 'agency.edit.settings.legal.contact.city', maxLength: 100 },
    { key: 'phoneNumber', label: 'agency.edit.settings.legal.contact.phone', maxLength: 64, type: 'tel' },
    { key: 'email', label: 'agency.edit.settings.legal.contact.email', maxLength: 255, type: 'email' },
] as const;

/**
 * Optional Datenschutzbeauftragte:r of the Träger (ORISO-Admin#1067), same shape as a
 * Beratungsstelle's DPO contact. A Beratungsstelle without its own inherits it for the
 * "Datenschutzbeauftragte:r" placeholder. Nothing here is required.
 */
export const TraegerDpoFields = ({ wrapField = (field) => field }: TraegerDpoFieldsProps) => {
    const { t } = useTranslation();
    return (
        <>
            <div className={styles.heading}>
                <p className={styles.title}>{t('tenants.form.dpo.title')}</p>
                <p className={styles.help}>{t('tenants.form.dpo.help')}</p>
            </div>
            {FIELDS.map(({ key, label, maxLength, ...rest }) =>
                wrapField(
                    <MuiFormField
                        key={key}
                        name={['dataProtectionOfficer', key]}
                        label={t(label)}
                        type={'type' in rest ? rest.type : undefined}
                        rules={key === 'email' ? [{ type: 'email', message: t('message.error.email.incorrect') }] : []}
                        inputProps={{ maxLength }}
                    />,
                    `dataProtectionOfficer.${key}`,
                ),
            )}
        </>
    );
};
