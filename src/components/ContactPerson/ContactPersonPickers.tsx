import { Form, type FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { MuiSelectField } from '../mui/MuiSelectField';
import { FieldGrid } from '../FieldGrid';
import type { ContactAdmin } from '../../types/contactPerson';
import { candidateOptions, validateContactPair } from './contactPersonModel';
import styles from './styles.module.scss';

export const CONTACT_FIELD = 'contactAdminId';
export const DEPUTY_FIELD = 'deputyAdminId';

interface ContactPersonPickersProps {
    form?: FormInstance;
    candidates: ContactAdmin[];
    /** Current contact and deputy, kept as options even when no longer candidates. */
    current?: Array<ContactAdmin | null | undefined>;
    loading?: boolean;
    disabled?: boolean;
}

/**
 * Two pickers, "Ansprechperson" and "Vertretung" (ORISO-Admin#1534). The deputy
 * stays disabled until a contact is chosen and never offers the contact itself.
 */
export const ContactPersonPickers = ({
    form,
    candidates,
    current = [],
    loading,
    disabled,
}: ContactPersonPickersProps) => {
    const { t } = useTranslation();
    const watched: string | null | undefined = Form.useWatch(CONTACT_FIELD, form);
    // useWatch is still undefined on the first render; the store already holds the initial value.
    const contactId: string | null | undefined = watched === undefined ? form?.getFieldValue(CONTACT_FIELD) : watched;
    const translate = (key: string) => t(key);

    return (
        // The deputy's helper text hangs below the field; the wrapper keeps room for it.
        <div className={styles.pickers}>
            <FieldGrid minColumnWidth={240}>
                <MuiSelectField
                    name={CONTACT_FIELD}
                    label="contactPerson.field.contact"
                    placeholder="contactPerson.field.none"
                    options={candidateOptions(candidates, translate, { keep: current })}
                    loading={loading}
                    disabled={disabled}
                    allowClear
                />
                <MuiSelectField
                    name={DEPUTY_FIELD}
                    label="contactPerson.field.deputy"
                    placeholder="contactPerson.field.none"
                    help={contactId ? undefined : 'contactPerson.field.deputyNeedsContact'}
                    options={candidateOptions(candidates, translate, { keep: current, exclude: contactId })}
                    loading={loading}
                    disabled={disabled || !contactId}
                    allowClear
                    rules={[
                        ({ getFieldValue }) => ({
                            validator: (_rule, value) => {
                                const error = validateContactPair({
                                    contactAdminId: getFieldValue(CONTACT_FIELD),
                                    deputyAdminId: value,
                                });
                                return error ? Promise.reject(new Error(t(error))) : Promise.resolve();
                            },
                        }),
                    ]}
                />
            </FieldGrid>
        </div>
    );
};
