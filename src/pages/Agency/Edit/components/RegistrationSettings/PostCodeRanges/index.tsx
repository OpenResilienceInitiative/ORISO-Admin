import { useContext } from 'react';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import AddIcon from '@mui/icons-material/Add';
import { ReactComponent as MinusIcon } from '../../../../../../resources/img/svg/minus.svg';
import { ReactComponent as XIcon } from '../../../../../../resources/img/svg/x-v2.svg';
import { MuiFormField } from '../../../../../../components/mui/MuiFormField';
import { M3Button } from '../../../../../../components/M3Button';
import styles from './styles.module.scss';

export const PostCodeRanges = () => {
    const { t } = useTranslation();
    const contextDisabled = useContext(DisabledContext);

    return (
        <div className={styles.postCodeRangesContainer}>
            <Form.List name="postCodes">
                {(fields, { add, remove }) => {
                    const elements = fields.map((field) => (
                        <div key={field.key} className={styles.space}>
                            <div className={styles.fieldsContainer}>
                                <MuiFormField
                                    label={t('agency.form.registrationSettings.fromPostCode')}
                                    className={styles.input}
                                    name={[field.name, 'from']}
                                    placeholder={t('agency.form.registrationSettings.fromPostCode')}
                                    required
                                    inputProps={{ maxLength: 5 }}
                                    rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                                />
                                <div className={styles.minusContainer}>
                                    <MinusIcon />
                                </div>
                                <MuiFormField
                                    label={t('agency.form.registrationSettings.toPostCode')}
                                    className={styles.input}
                                    name={[field.name, 'until']}
                                    placeholder={t('agency.form.registrationSettings.toPostCode')}
                                    required
                                    inputProps={{ maxLength: 5 }}
                                    rules={[{ min: 5, required: true, message: t('agency.postcode.minimum') }]}
                                />
                                <button
                                    type="button"
                                    aria-label={t('agency.form.registrationSettings.removePostCode')}
                                    disabled={contextDisabled}
                                    className={classNames(styles.remove, { [styles.disabled]: contextDisabled })}
                                    onClick={() => remove(field.name)}
                                >
                                    <XIcon />
                                </button>
                            </div>
                        </div>
                    ));

                    return (
                        <>
                            <p className={styles.newRangeLabel}>
                                {t('agency.form.registrationSettings.newPostCodeLabel')}
                            </p>
                            {elements}
                            {!contextDisabled && (
                                <M3Button
                                    variant="outlined"
                                    className={styles.addButton}
                                    icon={<AddIcon fontSize="inherit" />}
                                    onClick={() => add({ from: '', until: '' })}
                                >
                                    {t('agency.form.registrationSettings.addNewPostCode')}
                                </M3Button>
                            )}
                        </>
                    );
                }}
            </Form.List>
        </div>
    );
};
