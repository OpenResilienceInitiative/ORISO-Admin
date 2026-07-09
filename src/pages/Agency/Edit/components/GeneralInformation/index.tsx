import { useTranslation } from 'react-i18next';
import { Col, Row } from 'antd';
import { FormInputField } from '../../../../../components/FormInputField';
import { FormTextAreaField } from '../../../../../components/FormTextAreaField';
import { Card } from '../../../../../components/Card';

interface AgencyGeneralInformationProps {
    asFields?: boolean;
}

export const AgencyGeneralInformation = ({ asFields }: AgencyGeneralInformationProps) => {
    const { t } = useTranslation();

    const fields = (
        <>
            <FormInputField
                name="name"
                labelKey="agency.edit.general.general_information.name"
                placeholderKey="agency.edit.general.general_information.name"
                required
            />

            <Row gutter={[20, 10]}>
                <Col xs={12} sm={4}>
                    <FormInputField
                        name="postcode"
                        labelKey="agency.edit.general.address.postcode"
                        placeholderKey="agency.edit.general.address.postcode"
                        required
                        maxLength={5}
                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <FormInputField
                        name="city"
                        labelKey="agency.edit.general.address.city"
                        placeholderKey="agency.edit.general.address.city"
                        required
                    />
                </Col>
                <Col xs={16} sm={8}>
                    <FormInputField
                        name="street"
                        labelKey="agency.edit.general.address.street"
                        placeholderKey="agency.edit.general.address.street"
                        maxLength={255}
                    />
                </Col>
                <Col xs={8} sm={4}>
                    <FormInputField
                        name="houseNumber"
                        labelKey="agency.edit.general.address.house_number"
                        placeholderKey="agency.edit.general.address.house_number"
                        maxLength={20}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <FormInputField
                        name="floorBuilding"
                        labelKey="agency.edit.general.address.floor_building"
                        placeholderKey="agency.edit.general.address.floor_building"
                        maxLength={100}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <FormInputField
                        name="country"
                        labelKey="agency.edit.general.address.country"
                        placeholderKey="agency.edit.general.address.country"
                        maxLength={100}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <FormInputField
                        name="phone"
                        labelKey="agency.edit.general.address.phone"
                        placeholderKey="agency.edit.general.address.phone"
                        maxLength={30}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <FormInputField
                        name="phoneSecondary"
                        labelKey="agency.edit.general.address.phone_secondary"
                        placeholderKey="agency.edit.general.address.phone_secondary"
                        maxLength={30}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <FormInputField
                        name="email"
                        labelKey="agency.edit.general.address.email"
                        placeholderKey="agency.edit.general.address.email"
                        maxLength={255}
                    />
                </Col>
                <Col xs={24}>
                    <FormTextAreaField
                        name="description"
                        labelKey="agency.edit.general.general_information.description"
                        placeholderKey="agency.edit.general.general_information.description"
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
