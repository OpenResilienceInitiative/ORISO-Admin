import { Alert, Divider, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Card } from '../../../../../components/Card';
import { FormRadioGroupField } from '../../../../../components/FormRadioGroupField';
import { SelectFormField } from '../../../../../components/SelectFormField';
import { FormSwitchField } from '../../../../../components/FormSwitchField';
import { TypeOfUser } from '../../../../../enums/TypeOfUser';
import { useAgencyHasConsultants } from '../../../../../hooks/useAgencyHasConsultants';
import { useConsultantsOrAdminsData } from '../../../../../hooks/useConsultantsOrAdminsData';
import { PostCodeRanges } from './PostCodeRanges';
import styles from './styles.module.scss';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { isActiveRecord } from '../../../../../utils/deleteDate';

interface RegistrationSettingsProps {
    asFields?: boolean;
}

export const RegistrationSettings = ({ asFields }: RegistrationSettingsProps) => {
    const { t } = useTranslation();
    const { id } = useParams();
    const form = Form.useFormInstance();
    const postCodeRangesActive = Form.useWatch('postCodeRangesActive');
    const selectedConsultants = Form.useWatch('consultantIds') || [];
    const hasSelectedConsultants = selectedConsultants.length > 0;
    const showConsultantAssignment = !asFields;
    const { data: hasConsultants, isLoading } = useAgencyHasConsultants({ id });
    const { data: consultants, isLoading: isLoadingConsultants } = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        search: '*',
        pageSize: 1000,
        enabled: showConsultantAssignment,
    });
    const consultantOptions = useMemo(() => {
        const activeConsultants = (consultants?.data || []).filter(isActiveRecord);

        return convertToOptions(activeConsultants, ['firstname', 'lastname', 'email'], 'id');
    }, [consultants?.data]);
    const needsConsultantAssignment = id === 'add' ? !hasSelectedConsultants : !hasConsultants;

    useEffect(() => {
        if (id === 'add' && !hasSelectedConsultants) {
            form.setFieldValue('online', false);
        }
    }, [form, hasSelectedConsultants, id]);

    const fields = (
        <>
            {needsConsultantAssignment && (
                <Alert
                    className={styles.warning}
                    type="warning"
                    description={t(
                        showConsultantAssignment
                            ? 'agency.form.registrationSettings.assignmentWarning'
                            : 'agency.form.registrationSettings.onlineWarning',
                    )}
                />
            )}
            {showConsultantAssignment && (
                <SelectFormField
                    name="consultantIds"
                    label="agency.form.registrationSettings.consultants.label"
                    labelInValue
                    isMulti
                    allowClear
                    loading={isLoadingConsultants}
                    placeholder="agency.form.registrationSettings.consultants.placeholder"
                    options={consultantOptions}
                />
            )}
            <FormSwitchField
                inline
                className={styles.switch}
                labelKey="agency.form.registrationSettings.onlineDescription"
                name="online"
                disableLabels
                disabled={needsConsultantAssignment}
            />
            <Divider />

            <FormRadioGroupField
                className={styles.radioGroup}
                vertical
                labelKey="agency.form.registrationSettings.postCodeTitle"
                name="postCodeRangesActive"
            >
                <FormRadioGroupField.Radio value={false}>
                    {t('agency.form.registrationSettings.allPostCode')}
                </FormRadioGroupField.Radio>
                <FormRadioGroupField.Radio value>
                    {t('agency.form.registrationSettings.onlySelectedPostCodes')}
                </FormRadioGroupField.Radio>
            </FormRadioGroupField>

            {postCodeRangesActive && <PostCodeRanges />}
        </>
    );

    if (asFields) {
        return fields;
    }

    return (
        <Card
            autoHeight
            dialogContentPadding
            titleKey="agency.form.registrationSettings.title"
            isLoading={isLoading}
            variant="dialog"
        >
            {fields}
        </Card>
    );
};
