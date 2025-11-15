import { Form, Select } from 'antd';
import { FieldContext } from 'rc-field-form';
import { cloneElement, useContext, useMemo } from 'react';
import { CheckCircleTwoTone, WarningTwoTone } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { SelectFormField } from '../SelectFormField';
import { useTenantAdminData } from '../../hooks/useTenantAdminData.hook';
import styles from './styles.module.scss';

export interface TranslatableFormFieldProps {
    name: string | string[];
    children: React.ReactElement;
}

export const TranslatableFormField = ({ name, children }: TranslatableFormFieldProps) => {
    const { t } = useTranslation();
    const { data: tenantData } = useTenantAdminData();
    const namePath = name instanceof Array ? name : [name];
    const isDisabled = useContext(DisabledContext);
    const formContext = useContext(FieldContext);
    const fieldData = Form.useWatch([...namePath]);
    const languages = useMemo(
        () => tenantData?.settings?.activeLanguages || ['de'],
        [tenantData?.settings?.activeLanguages],
    );

    const errors = languages
        .map((lng) => {
            const fieldErrors = formContext.getFieldError([...namePath, lng]);
            const fieldValue = formContext.getFieldValue([...namePath, lng]);
            return !fieldValue || fieldErrors.length > 0 ? lng : null;
        })
        .filter(Boolean);

    const hasErrors = useMemo(() => errors.length > 0, [errors]);

    return (
        <>
            {languages.length > 1 && (
                <SelectFormField
                    initialValue="de"
                    label="languages"
                    name={[...namePath, 'translate']}
                    required
                    validateStatus={hasErrors && !isDisabled && 'error'}
                    help={hasErrors && !isDisabled && t('form.errors.fillAllLanguages')}
                    className={styles.translateField}
                >
                    {languages.map((language) => (
                        <Select.Option value={language} key={language}>
                            <div className={styles.containerLabel}>
                                {t(`language.${language}`)}
                                {errors.includes(language) ? (
                                    <WarningTwoTone twoToneColor="#FF9F00" />
                                ) : (
                                    <CheckCircleTwoTone twoToneColor="#4FCC5C" />
                                )}
                            </div>
                        </Select.Option>
                    ))}
                </SelectFormField>
            )}

            {languages.map((language) =>
                cloneElement(children, {
                    name: [...namePath, language],
                    key: language,
                    className: classNames({
                        [styles.activeLanguage]: fieldData?.translate === language || languages.length === 1,
                        [styles.notActive]: fieldData?.translate !== language && languages.length !== 1,
                    }),
                }),
            )}
        </>
    );
};
