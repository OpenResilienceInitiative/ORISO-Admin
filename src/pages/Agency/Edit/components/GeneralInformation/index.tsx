import { useTranslation } from 'react-i18next';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { MuiFormField, MuiMultilineFormField } from '../../../../../components/mui/MuiFormField';
import { Card } from '../../../../../components/Card';
import { FieldGrid } from '../../../../../components/FieldGrid';
import { AddressFields, fieldIcon } from '../../../../../components/AddressFields';
import { OpeningHoursFormField } from '../../../../../components/OpeningHoursInput';

interface AgencyGeneralInformationProps {
    asFields?: boolean;
    /** Narrowest a field column may get; a panel inside a tile needs less than a whole card. */
    minColumnWidth?: number;
}

export const AgencyGeneralInformation = ({ asFields, minColumnWidth }: AgencyGeneralInformationProps) => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };

    const fields = (
        <FieldGrid minColumnWidth={minColumnWidth}>
            {/* Name + description span the full row; the address fields flow into
                as many columns as the card width allows (FieldGrid decides — the
                per-field antd Col spans are gone). Field data binding is unchanged:
                every Form.Item name/rule/inputProps is identical to before. */}
            <FieldGrid.Wide>
                <MuiFormField
                    name="name"
                    label={t('agency.edit.general.general_information.name')}
                    placeholder={t('agency.edit.general.general_information.name')}
                    required
                    rules={[requiredRule]}
                />
            </FieldGrid.Wide>

            <FieldGrid.Wide>
                <AddressFields />
            </FieldGrid.Wide>
            <MuiFormField
                name="phone"
                startAdornment={fieldIcon(<PhoneOutlinedIcon fontSize="small" />)}
                label={t('agency.edit.general.address.phone')}
                placeholder={t('agency.edit.general.address.phone')}
                inputProps={{ maxLength: 30 }}
            />
            <MuiFormField
                name="phoneSecondary"
                startAdornment={fieldIcon(<PhoneOutlinedIcon fontSize="small" />)}
                label={t('agency.edit.general.address.phone_secondary')}
                placeholder={t('agency.edit.general.address.phone_secondary')}
                inputProps={{ maxLength: 30 }}
            />
            <MuiFormField
                name="email"
                startAdornment={fieldIcon(<EmailOutlinedIcon fontSize="small" />)}
                label={t('agency.edit.general.address.email')}
                placeholder={t('agency.edit.general.address.email')}
                inputProps={{ maxLength: 255 }}
            />
            <FieldGrid.Wide>
                <OpeningHoursFormField name="openingHours" label={t('agency.edit.general.address.opening_hours')} />
            </FieldGrid.Wide>
            <FieldGrid.Wide>
                <MuiMultilineFormField
                    name="description"
                    label={t('agency.edit.general.general_information.description')}
                    placeholder={t('agency.edit.general.general_information.description')}
                />
            </FieldGrid.Wide>
        </FieldGrid>
    );

    if (asFields) {
        return fields;
    }

    return (
        <Card autoHeight dialogContentPadding titleKey="agency.edit.general.general_information" variant="dialog">
            {fields}
        </Card>
    );
};
