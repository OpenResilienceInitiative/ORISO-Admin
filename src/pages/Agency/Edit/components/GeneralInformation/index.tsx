import { useTranslation } from 'react-i18next';
import { Col, Row } from 'antd';
import { MuiFormField, MuiMultilineFormField } from '../../../../../components/mui/MuiFormField';
import { Card } from '../../../../../components/Card';

interface AgencyGeneralInformationProps {
    asFields?: boolean;
}

export const AgencyGeneralInformation = ({ asFields }: AgencyGeneralInformationProps) => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };

    const fields = (
        <>
            <MuiFormField
                name="name"
                label={t('agency.edit.general.general_information.name')}
                placeholder={t('agency.edit.general.general_information.name')}
                required
                rules={[requiredRule]}
            />

            <Row gutter={[20, 10]}>
                <Col xs={12} sm={4}>
                    <MuiFormField
                        name="postcode"
                        label={t('agency.edit.general.address.postcode')}
                        placeholder={t('agency.edit.general.address.postcode')}
                        required
                        inputProps={{ maxLength: 5 }}
                        rules={[requiredRule, { min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <MuiFormField
                        name="city"
                        label={t('agency.edit.general.address.city')}
                        placeholder={t('agency.edit.general.address.city')}
                        required
                        rules={[requiredRule]}
                    />
                </Col>
                <Col xs={16} sm={8}>
                    <MuiFormField
                        name="street"
                        label={t('agency.edit.general.address.street')}
                        placeholder={t('agency.edit.general.address.street')}
                        inputProps={{ maxLength: 255 }}
                    />
                </Col>
                <Col xs={8} sm={4}>
                    <MuiFormField
                        name="houseNumber"
                        label={t('agency.edit.general.address.house_number')}
                        placeholder={t('agency.edit.general.address.house_number')}
                        inputProps={{ maxLength: 20 }}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <MuiFormField
                        name="floorBuilding"
                        label={t('agency.edit.general.address.floor_building')}
                        placeholder={t('agency.edit.general.address.floor_building')}
                        inputProps={{ maxLength: 100 }}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <MuiFormField
                        name="country"
                        label={t('agency.edit.general.address.country')}
                        placeholder={t('agency.edit.general.address.country')}
                        inputProps={{ maxLength: 100 }}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <MuiFormField
                        name="phone"
                        label={t('agency.edit.general.address.phone')}
                        placeholder={t('agency.edit.general.address.phone')}
                        inputProps={{ maxLength: 30 }}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <MuiFormField
                        name="phoneSecondary"
                        label={t('agency.edit.general.address.phone_secondary')}
                        placeholder={t('agency.edit.general.address.phone_secondary')}
                        inputProps={{ maxLength: 30 }}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <MuiFormField
                        name="email"
                        label={t('agency.edit.general.address.email')}
                        placeholder={t('agency.edit.general.address.email')}
                        inputProps={{ maxLength: 255 }}
                    />
                </Col>
                <Col xs={24}>
                    <MuiMultilineFormField
                        name="openingHours"
                        label={t('agency.edit.general.address.opening_hours')}
                        placeholder={t('agency.edit.general.address.opening_hours')}
                    />
                </Col>
                <Col xs={24}>
                    <MuiMultilineFormField
                        name="description"
                        label={t('agency.edit.general.general_information.description')}
                        placeholder={t('agency.edit.general.general_information.description')}
                    />
                </Col>
            </Row>
        </>
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
