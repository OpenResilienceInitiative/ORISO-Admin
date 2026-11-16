import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { Card } from '../../../components/Card';
import { Notify } from '../../../components/Notify';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import { MuiSelectField } from '../../../components/mui/MuiSelectField';
import { fieldIcon } from '../../../components/AddressFields';
import styles from '../../../components/ContactPerson/styles.module.scss';

/**
 * User panel parts of ORISO-Admin#1534 for agency and tenant admins: the optional
 * contact e-mail counsellors see instead of the login e-mail, and the centres this
 * admin is contact person or deputy for.
 */

export const CONTACT_EMAIL_FIELD = 'contactEmail';
export const CONTACT_ROLES_FIELD = 'contactPersonRoles';

/** Optional; blank is saved as "none" so the login e-mail shows again. */
export const AdminContactEmailField = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    return (
        <MuiFormField
            name={CONTACT_EMAIL_FIELD}
            type="email"
            label={t('admin.contactEmail')}
            placeholder={t('admin.contactEmail.placeholder')}
            helpText={t('admin.contactEmail.help')}
            startAdornment={fieldIcon(<EmailOutlinedIcon fontSize="small" />)}
            inputProps={{ maxLength: 255 }}
            disabled={disabled}
            rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
        />
    );
};

export type ContactRole = 'NONE' | 'CONTACT' | 'DEPUTY';

export interface ContactPersonForCentre {
    agencyId: number;
    agencyName: string;
    role: ContactRole;
    /** Who holds the contact role today when it is not this admin; shown below the name. */
    currentContactName?: string | null;
}

const ROLE_OPTIONS: Array<{ value: ContactRole; labelKey: string }> = [
    { value: 'NONE', labelKey: 'admin.contactPersonFor.role.none' },
    { value: 'CONTACT', labelKey: 'contactPerson.field.contact' },
    { value: 'DEPUTY', labelKey: 'contactPerson.field.deputy' },
];

/** Form initial values for {@link ContactPersonForSection}: `{ [agencyId]: role }`. */
export const contactRolesInitialValues = (centres: ContactPersonForCentre[]) =>
    Object.fromEntries(centres.map((centre) => [String(centre.agencyId), centre.role]));

/**
 * Section "Ansprechperson für": one row per centre of this admin with a role
 * select (—, Ansprechperson, Vertretung). Must sit inside the page's antd Form.
 */
export const ContactPersonForSection = ({
    centres,
    disabled,
    loading,
    failedCentres = [],
    onRetry,
}: {
    centres: ContactPersonForCentre[];
    disabled?: boolean;
    /** The stored pairs are still loading. */
    loading?: boolean;
    /** Names of centres whose stored pair could not be read; their rows are left out. */
    failedCentres?: string[];
    onRetry?: () => void;
}) => {
    const { t } = useTranslation();
    // The select sorts by label; "—" sorts before the letters, so "none" stays first.
    const options = ROLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }));

    return (
        <Card titleKey="admin.contactPersonFor.title" headerIcon={<SupportAgentOutlinedIcon />}>
            <p className={styles.description}>{t('admin.contactPersonFor.text')}</p>
            {failedCentres.length > 0 && (
                <>
                    <Notify severity="error">
                        {t('admin.contactPersonFor.loadFailed', { centres: failedCentres.join(', ') })}
                    </Notify>
                    {/* The pop-up can be closed; the text and its retry stay in the tile. */}
                    <p className={styles.empty} data-testid="contact-role-load-failed">
                        {t('admin.contactPersonFor.loadFailed', { centres: failedCentres.join(', ') })}{' '}
                        {onRetry && (
                            // The editor opens read-only, and the form's `disabled` would reach this
                            // button too. Reloading changes nothing, so it stays usable.
                            <Button type="link" onClick={onRetry} disabled={false}>
                                {t('admin.contactPersonFor.retry')}
                            </Button>
                        )}
                    </p>
                </>
            )}
            {loading && (
                <p className={styles.empty} role="status">
                    {t('admin.contactPersonFor.loading')}
                </p>
            )}
            {centres.length === 0 && !loading && failedCentres.length === 0 && (
                <p className={styles.empty}>{t('admin.contactPersonFor.empty')}</p>
            )}
            {centres.length > 0 && (
                <ul className={styles.rows}>
                    {centres.map((centre) => (
                        <li key={centre.agencyId} data-testid={`contact-role-${centre.agencyId}`}>
                            {/* The group names the centre, so the short field label "Rolle" stays unambiguous. */}
                            <div
                                className={styles.row}
                                role="group"
                                aria-labelledby={`contact-role-name-${centre.agencyId}`}
                            >
                                <span className={styles.rowName}>
                                    <span id={`contact-role-name-${centre.agencyId}`}>{centre.agencyName}</span>
                                    {centre.role !== 'CONTACT' && centre.currentContactName && (
                                        <span className={styles.rowHolder}>
                                            {t('admin.contactPersonFor.currentContact', {
                                                name: centre.currentContactName,
                                            })}
                                        </span>
                                    )}
                                </span>
                                <MuiSelectField
                                    name={[CONTACT_ROLES_FIELD, String(centre.agencyId)]}
                                    label="admin.contactPersonFor.role"
                                    options={options}
                                    disabled={disabled}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};
