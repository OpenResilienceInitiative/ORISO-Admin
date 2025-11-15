import { useContext } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import { Button, Form, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { ReactComponent as MinusIcon } from '../../../../../../resources/img/svg/minus.svg';
import { ReactComponent as XIcon } from '../../../../../../resources/img/svg/x-v2.svg';
import { FormInputField } from '../../../../../../components/FormInputField';
import styles from './styles.module.scss';

export const PostCodeRanges = () => {
    const { t } = useTranslation();
    const contextDisabled = useContext(DisabledContext);

    return (
        <div className={styles.postCodeRangesContainer}>
            <Form.List name="postCodes">
                {(fields, { add, remove }) => {
                    const elements = fields.map((field) => (
                        <div key={field.key}>
                            <Space size="small" align="start" className={styles.space}>
                                <div className={styles.fieldsContainer}>
                                    <FormInputField
                                        labelKey="agency.form.registrationSettings.fromPostCode"
                                        className={styles.input}
                                        name={[field.name, 'from']}
                                        placeholderKey="agency.form.registrationSettings.fromPostCode"
                                        required
                                        maxLength={5}
                                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                                    />
                                    <div className={styles.minusContainer}>
                                        <MinusIcon />
                                    </div>
                                    <FormInputField
                                        labelKey="agency.form.registrationSettings.toPostCode"
                                        className={styles.input}
                                        name={[field.name, 'until']}
                                        placeholderKey="agency.form.registrationSettings.toPostCode"
                                        required
                                        maxLength={5}
                                        rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                                    />
                                </div>
                                <Button
                                    disabled={contextDisabled}
                                    type={contextDisabled ? 'default' : 'primary'}
                                    className={classNames(styles.remove, { [styles.disabled]: contextDisabled })}
                                    onClick={() => remove(field.name)}
                                >
                                    <XIcon />
                                </Button>
                            </Space>
                        </div>
                    ));

                    return (
                        <>
                            <Typography.Paragraph>
                                {t('agency.form.registrationSettings.newPostCodeLabel')}
                            </Typography.Paragraph>
                            {elements}
                            {!contextDisabled && (
                                <Button
                                    size="small"
                                    className={styles.addButton}
                                    type="ghost"
                                    icon={<PlusOutlined />}
                                    onClick={() => add({ from: '', until: '' })}
                                >
                                    {t('agency.form.registrationSettings.addNewPostCode')}
                                </Button>
                            )}
                        </>
                    );
                }}
            </Form.List>
        </div>
    );
};
