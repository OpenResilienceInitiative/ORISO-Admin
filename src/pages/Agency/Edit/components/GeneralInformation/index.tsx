import { useTranslation } from 'react-i18next';
import { MuiFormField, MuiMultilineFormField } from '../../../../../components/mui/MuiFormField';
import { OpeningHoursFormField } from '../../../../../components/TimeslotField/OpeningHoursFormField';
import { Card } from '../../../../../components/Card';
import { AgencyCounsellingIcon } from '../../../../../components/CustomIcons/AgencyIcons';
import { FieldGrid } from '../../../../../components/FieldGrid';

interface AgencyGeneralInformationProps {
    asFields?: boolean;
}

export const AgencyGeneralInformation = ({ asFields }: AgencyGeneralInformationProps) => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };

    const fields = (
        <FieldGrid minColumnWidth={240}>
            {/* Name + description span the full row; the address fields flow into
                as many columns as the card width allows. The 240px floor is what
                lets a wide (820px) rail card reach THREE columns — the point of the
                wide class is a compact card, not a taller one. Field data binding is
                unchanged: every Form.Item name/rule/inputProps is identical. */}
            <FieldGrid.Wide>
                <MuiFormField
                    name="name"
                    label={t('agency.edit.general.general_information.name')}
                    placeholder={t('agency.edit.general.general_information.name')}
                    required
                    rules={[requiredRule]}
                />
            </FieldGrid.Wide>

            <MuiFormField
                name="postcode"
                label={t('agency.edit.general.address.postcode')}
                placeholder={t('agency.edit.general.address.postcode')}
                required
                inputProps={{ maxLength: 5 }}
                rules={[requiredRule, { min: 5, required: true, message: t('agency.postcode.minimum') }]}
            />
            <MuiFormField
                name="city"
                label={t('agency.edit.general.address.city')}
                placeholder={t('agency.edit.general.address.city')}
                required
                rules={[requiredRule]}
            />
            <MuiFormField
                name="street"
                label={t('agency.edit.general.address.street')}
                placeholder={t('agency.edit.general.address.street')}
                inputProps={{ maxLength: 255 }}
            />
            <MuiFormField
                name="houseNumber"
                label={t('agency.edit.general.address.house_number')}
                placeholder={t('agency.edit.general.address.house_number')}
                inputProps={{ maxLength: 20 }}
            />
            <MuiFormField
                name="floorBuilding"
                label={t('agency.edit.general.address.floor_building')}
                placeholder={t('agency.edit.general.address.floor_building')}
                inputProps={{ maxLength: 100 }}
            />
            <MuiFormField
                name="country"
                label={t('agency.edit.general.address.country')}
                placeholder={t('agency.edit.general.address.country')}
                inputProps={{ maxLength: 100 }}
            />
            <MuiFormField
                name="phone"
                label={t('agency.edit.general.address.phone')}
                placeholder={t('agency.edit.general.address.phone')}
                inputProps={{ maxLength: 30 }}
            />
            <MuiFormField
                name="phoneSecondary"
                label={t('agency.edit.general.address.phone_secondary')}
                placeholder={t('agency.edit.general.address.phone_secondary')}
                inputProps={{ maxLength: 30 }}
            />
            <MuiFormField
                name="email"
                label={t('agency.edit.general.address.email')}
                placeholder={t('agency.edit.general.address.email')}
                inputProps={{ maxLength: 255 }}
            />
            <FieldGrid.Wide>
                <OpeningHoursFormField label={t('agency.edit.general.address.opening_hours')} />
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
        <Card
            autoHeight
            dialogContentPadding
            titleKey="agency.edit.general.general_information"
            subTitleKey="agency.edit.general.general_information.purpose"
            headerIcon={<AgencyCounsellingIcon />}
            variant="dialog"
        >
            {fields}
        </Card>
    );
};
