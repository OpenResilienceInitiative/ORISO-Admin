import { Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import Paragraph from 'antd/lib/typography/Paragraph';
import { Card } from '../../../../../components/Card';
import { FormInputField } from '../../../../../components/FormInputField';
import { CardEditable } from '../../../../../components/CardEditable';

interface ResponsibleSettingsProps {
    initialValues?: Record<string, unknown>;
    onSave?: <T>(formData: T, options?: { onError?: () => void }) => void;
}

const ResponsibleSettingsFields = () => {
    const [t] = useTranslation();

    return (
        <>
            <Paragraph className="text desc">{t('agency.edit.settings.legal.responsible.text')}</Paragraph>
            <Row gutter={[20, 10]}>
                <Col xs={24}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'nameAndLegalForm']}
                        labelKey="agency.edit.settings.legal.responsible.identifier"
                        placeholderKey="agency.edit.settings.legal.responsible.identifier"
                        required
                    />
                </Col>
                <Col xs={14}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'postcode']}
                        labelKey="agency.edit.settings.legal.responsible.postcode"
                        placeholderKey="agency.edit.settings.legal.responsible.postcode"
                        required
                        maxLength={5}
                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                </Col>
                <Col xs={10}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'city']}
                        labelKey="agency.edit.settings.legal.responsible.city"
                        placeholderKey="agency.edit.settings.legal.responsible.city"
                        required
                        maxLength={100}
                    />
                </Col>
                <Col xs={14}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'phoneNumber']}
                        labelKey="agency.edit.settings.legal.responsible.phone"
                        placeholderKey="agency.edit.settings.legal.responsible.phone"
                        required
                        maxLength={100}
                    />
                </Col>
                <Col xs={10}>
                    <FormInputField
                        name={['dataProtection', 'agencyDataProtectionResponsibleContact', 'email']}
                        labelKey="agency.edit.settings.legal.responsible.email"
                        placeholderKey="agency.edit.settings.legal.responsible.email"
                        required
                        maxLength={100}
                    />
                </Col>
            </Row>
        </>
    );
};

export const ResponsibleSettings = ({ initialValues, onSave }: ResponsibleSettingsProps) => {
    if (onSave) {
        return (
            <CardEditable
                allowUnsavedChanges
                initialValues={initialValues}
                titleKey="agency.edit.settings.legal.responsible.title"
                variant="dialog"
                editButtonPlacement="footer"
                onSave={onSave}
            >
                <ResponsibleSettingsFields />
            </CardEditable>
        );
    }

    return (
        <Card titleKey="agency.edit.settings.legal.responsible.title" variant="dialog">
            <ResponsibleSettingsFields />
        </Card>
    );
};
