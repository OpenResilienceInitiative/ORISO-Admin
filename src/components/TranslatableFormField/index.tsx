import { Form, Select } from 'antd';
import { cloneElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { SelectFormField } from '../SelectFormField';
import { useTenantAdminData } from '../../hooks/useTenantAdminData.hook';
import styles from './styles.module.scss';

export interface TranslatableFormFieldProps {
    name: string | string[];
    children: React.ReactElement<any>;
}

// Per-language editing is OPTIONAL: the language switcher only lets you edit
// each active language if you want to. There is intentionally no "fill all
// languages" requirement (that was a wrong constraint). Machine translation
// (opt-in, via API, clearly labelled) is planned as a later helper.
export const TranslatableFormField = ({ name, children }: TranslatableFormFieldProps) => {
    const { t } = useTranslation();
    const { data: tenantData } = useTenantAdminData();
    const namePath = name instanceof Array ? name : [name];
    const fieldData = Form.useWatch([...namePath]);
    const languages = useMemo(
        () => tenantData?.settings?.activeLanguages || ['de'],
        [tenantData?.settings?.activeLanguages],
    );

    return (
        <>
            {languages.length > 1 && (
                <SelectFormField
                    initialValue="de"
                    label="languages"
                    name={[...namePath, 'translate']}
                    className={styles.translateField}
                >
                    {languages.map((language) => (
                        <Select.Option value={language} key={language}>
                            {t(`language.${language}`)}
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
