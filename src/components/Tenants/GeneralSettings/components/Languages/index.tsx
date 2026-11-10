import { Checkbox, Form } from 'antd';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import classNames from 'classnames';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../../../../appConfig';
import { CardEditable } from '../../../../CardEditable';
import { TilePicture } from '../../../../TileFill';
import { Modal } from '../../../../Modal';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import translationPicture from '../../../../../resources/img/tile-help/translation.webp';
import styles from './styles.module.scss';

/** Always on and never removable: the language every text exists in. */
const BASE_LANGUAGE = 'de';

const ensureDefaultLanguage = (languages: string[]) => {
    const languageSet = new Set(languages);

    languageSet.add(BASE_LANGUAGE);

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
    const activeLanguages = data?.settings?.activeLanguages?.length ? data.settings.activeLanguages : [BASE_LANGUAGE];
    // The base language leads the list, so the one that cannot be removed is seen first.
    const shownLanguages = [BASE_LANGUAGE, ...activeLanguages.filter((language) => language !== BASE_LANGUAGE)];
    const baseLanguageNote = <span className={styles.srOnly}>{`, ${t('organisations.languageBase')}`}</span>;
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
                readOnlyAccess={readOnly}
                isLoading={isLoading}
                initialValues={initialValues}
                titleKey="organisations.language"
                subTitle={t<string>('organisations.languageSubtitle')}
                onSave={onSave}
                formProp={form}
                variant="dialog"
                editButtonPlacement="footer"
                headerIcon={<LanguageOutlinedIcon />}
                picture={<TilePicture src={translationPicture} />}
            >
                {({ editing }) =>
                    editing ? (
                        <Form.Item
                            className={styles.languageSelectorField}
                            name={['settings', 'activeLanguages']}
                            rules={[{ required: true, message: t('form.errors.required.multiSelect') }]}
                        >
                            <Checkbox.Group className={styles.languageToggleGroup}>
                                {options.map((option) => {
                                    const isBase = option.value === BASE_LANGUAGE;
                                    return (
                                        <Checkbox
                                            className={styles.languageToggle}
                                            disabled={isBase}
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {isBase && <LockOutlinedIcon aria-hidden="true" />}
                                            {option.label}
                                            {isBase && baseLanguageNote}
                                        </Checkbox>
                                    );
                                })}
                            </Checkbox.Group>
                        </Form.Item>
                    ) : (
                        <div className={styles.languageChips}>
                            {shownLanguages.map((language) => (
                                <span
                                    className={classNames(styles.languageChip, {
                                        [styles.baseLanguageChip]: language === BASE_LANGUAGE,
                                    })}
                                    key={language}
                                >
                                    {t(`language.${language}`)}
                                    {language === BASE_LANGUAGE && baseLanguageNote}
                                </span>
                            ))}
                        </div>
                    )
                }
            </CardEditable>
            {modal && (
                <Modal
                    titleKey="organisations.languageModalTitle"
                    icon={<InfoOutlinedIcon />}
                    contentKey="organisations.languageModalContent"
                    okLabelKey="organisations.languageModalConfirm"
                    onConfirm={() => setModal(false)}
                    onClose={() => setModal(false)}
                />
            )}
        </>
    );
};
