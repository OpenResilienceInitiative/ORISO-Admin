import { Button, Checkbox, Form } from 'antd';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../../../../appConfig';
import { CardEditable } from '../../../../CardEditable';
import { Modal } from '../../../../Modal';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import styles from './styles.module.scss';

const ensureDefaultLanguage = (languages: string[]) => {
    const languageSet = new Set(languages);

    languageSet.add('de');

    return supportedLanguages.filter((language) => languageSet.has(language));
};

const hasAddedLanguage = (previousLanguages: string[], nextLanguages: string[]) => {
    const previousLanguageSet = new Set(previousLanguages);

    return nextLanguages.some((language) => !previousLanguageSet.has(language));
};

export const Languages = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [modal, setModal] = useState(false);
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);
    const options = supportedLanguages.map((language) => ({ value: language, label: t(`language.${language}`) }));
    const activeLanguages = data?.settings?.activeLanguages?.length ? data.settings.activeLanguages : ['de'];
    const initialValues = {
        ...data,
        settings: {
            ...data?.settings,
            activeLanguages,
        },
    };
    const onSave = (values) => {
        const selectedLanguages = values?.settings?.activeLanguages || activeLanguages;
        const nextActiveLanguages = ensureDefaultLanguage(selectedLanguages);
        const languageWasAdded = hasAddedLanguage(activeLanguages, nextActiveLanguages);

        mutate(
            {
                ...values,
                settings: {
                    ...values?.settings,
                    activeLanguages: nextActiveLanguages,
                },
            },
            {
                onSuccess: () => {
                    if (languageWasAdded) {
                        setModal(true);
                    }
                },
            },
        );
    };

    return (
        <>
            <CardEditable
                key={`languages-${tenantId}-${readOnly}-${activeLanguages.join('-')}`}
                allowEdit={!readOnly}
                isLoading={isLoading}
                initialValues={initialValues}
                titleKey="organisations.language"
                subTitle={t<string>('organisations.languageSubtitle')}
                onSave={onSave}
                formProp={form}
                variant="dialog"
                editButtonPlacement="footer"
                headerIcon={<LanguageOutlinedIcon />}
            >
                {({ editing }) =>
                    editing ? (
                        <Form.Item
                            className={styles.languageSelectorField}
                            name={['settings', 'activeLanguages']}
                            rules={[{ required: true, message: t('form.errors.required.multiSelect') }]}
                        >
                            <Checkbox.Group className={styles.languageToggleGroup}>
                                {options.map((option) => (
                                    <Checkbox
                                        className={styles.languageToggle}
                                        disabled={option.value === 'de'}
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </Checkbox>
                                ))}
                            </Checkbox.Group>
                        </Form.Item>
                    ) : (
                        <div className={styles.languageChips}>
                            {activeLanguages.map((language) => (
                                <span className={styles.languageChip} key={language}>
                                    {t(`language.${language}`)}
                                </span>
                            ))}
                        </div>
                    )
                }
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
