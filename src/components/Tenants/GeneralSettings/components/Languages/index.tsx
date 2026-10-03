import { Checkbox, Form } from 'antd';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../../../../appConfig';
import { CardEditable } from '../../../../CardEditable';
import { Modal } from '../../../../Modal';
import { useTenantAppearanceFormData } from '../../../../../hooks/useTenantAppearanceFormData';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
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

// #910: the more dangerous direction — hides the interface from advice seekers
// currently using that language and orphans its translated legal texts/topics.
const hasRemovedLanguage = (previousLanguages: string[], nextLanguages: string[]) => {
    const nextLanguageSet = new Set(nextLanguages);

    return previousLanguages.some((language) => !nextLanguageSet.has(language));
};

export const Languages = ({ tenantId, readOnly = false }: { tenantId: string; readOnly?: boolean }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [modal, setModal] = useState(false);
    // #910: a removal is gated on confirmation *before* it is saved, unlike the
    // add case's after-the-fact notice — holds the pending values/options
    // (CardEditable already closed the edit card optimistically by the time
    // onSave runs) so `commitSave` can run on confirm, or `options.onError`
    // can reopen the card unsaved on cancel.
    const [pendingRemoval, setPendingRemoval] = useState<{
        values: Record<string, unknown>;
        options?: { onError?: () => void };
    } | null>(null);
    const { data, isLoading, mutate } = useTenantAppearanceFormData(tenantId);
    const { isSuperAdmin } = useUserRoles();
    const options = supportedLanguages.map((language) => ({ value: language, label: t(`language.${language}`) }));
    const activeLanguages = data?.settings?.activeLanguages?.length ? data.settings.activeLanguages : ['de'];
    const initialValues = {
        ...data,
        settings: {
            ...data?.settings,
            activeLanguages,
        },
    };
    const commitSave = (values, saveOptions?: { onError?: () => void }) => {
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
                onError: saveOptions?.onError,
            },
        );
    };
    const onSave = (values, saveOptions?: { onError?: () => void }) => {
        const selectedLanguages = values?.settings?.activeLanguages || activeLanguages;
        const nextActiveLanguages = ensureDefaultLanguage(selectedLanguages);
        const languageWasRemoved = hasRemovedLanguage(activeLanguages, nextActiveLanguages);

        if (languageWasRemoved) {
            setPendingRemoval({ values, options: saveOptions });
            return;
        }

        commitSave(values, saveOptions);
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
                    icon={<InfoOutlinedIcon />}
                    contentKey={
                        isSuperAdmin
                            ? 'organisations.languageModalContentPlatformAdmin'
                            : 'organisations.languageModalContent'
                    }
                    okLabelKey="organisations.languageModalConfirm"
                    onConfirm={() => setModal(false)}
                    onClose={() => setModal(false)}
                />
            )}
            {pendingRemoval && (
                <Modal
                    titleKey="organisations.languageRemovalModalTitle"
                    icon={<InfoOutlinedIcon />}
                    contentKey={
                        isSuperAdmin
                            ? 'organisations.languageRemovalModalContentPlatformAdmin'
                            : 'organisations.languageRemovalModalContent'
                    }
                    cancelLabelKey="organisations.languageRemovalModalCancel"
                    okLabelKey="organisations.languageRemovalModalConfirm"
                    onConfirm={() => {
                        const { values, options: saveOptions } = pendingRemoval;
                        setPendingRemoval(null);
                        commitSave(values, saveOptions);
                    }}
                    onClose={() => {
                        pendingRemoval.options?.onError?.();
                        setPendingRemoval(null);
                    }}
                />
            )}
        </>
    );
};
