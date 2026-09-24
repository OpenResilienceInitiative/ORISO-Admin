import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MuiFormField } from '../../mui/MuiFormField';

interface TraegerSenderFieldsProps {
    /** Wraps each field, so hosts keep their own spacing (`fieldGroup` on Allgemein, a grid in onboarding). */
    wrapField?: (field: ReactNode, name: string) => ReactNode;
}

/**
 * The Träger's own sender block for the mail footer (Frank, 2026-09-23): full legal name, contact
 * e-mail and phone. All optional — an empty value falls back (legal name → Träger name, contact →
 * the platform operator's entry). Limits and the e-mail rule mirror the operator's "Betreiber"
 * fields in Globale Einstellungen → Dokument-Stammdaten.
 */
export const TraegerSenderFields = ({ wrapField = (field) => field }: TraegerSenderFieldsProps) => {
    const { t } = useTranslation();
    return (
        <>
            {wrapField(
                <MuiFormField
                    name="legalName"
                    label={t('tenants.form.sender.legalName')}
                    helpText={t('tenants.form.sender.legalName.help')}
                    inputProps={{ maxLength: 255 }}
                />,
                'legalName',
            )}
            {wrapField(
                <MuiFormField
                    name="contactEmail"
                    label={t('tenants.form.sender.contactEmail')}
                    helpText={t('tenants.form.sender.contact.help')}
                    type="email"
                    rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                    inputProps={{ maxLength: 255 }}
                />,
                'contactEmail',
            )}
            {wrapField(
                <MuiFormField
                    name="contactPhone"
                    label={t('tenants.form.sender.contactPhone')}
                    type="tel"
                    inputProps={{ maxLength: 64 }}
                />,
                'contactPhone',
            )}
        </>
    );
};
