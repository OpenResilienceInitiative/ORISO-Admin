import { Button, Form } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../../../../appConfig';
import { CardEditable } from '../../../../CardEditable';
import { Modal } from '../../../../Modal';
import { SelectFormField } from '../../../../SelectFormField';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';

export const Languages = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [modal, setModal] = useState(false);
    const { data, isLoading } = useSingleTenantData({ id: tenantId });

    const { mutate } = useTenantAdminDataMutation({
        id: tenantId,
        onSuccess: () => setModal(true),
    });
    const options = supportedLanguages.map((language) => ({ value: language, label: t(`language.${language}`) }));

    return (
        <>
            <CardEditable
                isLoading={isLoading}
                initialValues={{ ...data }}
                titleKey="organisations.language"
                subTitle={t<string>('organisations.languageSubtitle')}
                onSave={mutate}
                formProp={form}
            >
                <SelectFormField isMulti name={['settings', 'activeLanguages']} options={options} required />
            </CardEditable>
            {modal && (
                <Modal
                    titleKey="organisations.languageModalTitle"
                    contentKey="organisations.languageModalContent"
                    onClose={() => setModal(false)}
                    footer={
                        <>
                            <span />
                            <Button type="primary" onClick={() => setModal(false)}>
                                {t('organisations.languageModalConfirm')}
                            </Button>
                        </>
                    }
                />
            )}
        </>
    );
};
