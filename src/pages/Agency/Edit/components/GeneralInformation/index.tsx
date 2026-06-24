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
                <Col xs={12}>
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
