import { Alert, Divider, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { Card } from '../../../../../components/Card';
import { FormRadioGroupField } from '../../../../../components/FormRadioGroupField';
import { FormSwitchField } from '../../../../../components/FormSwitchField';
import { useAgencyHasConsultants } from '../../../../../hooks/useAgencyHasConsultants';
import { PostCodeRanges } from './PostCodeRanges';
import styles from './styles.module.scss';
import getConsultingTypes from '../../../../../api/consultingtype/getConsultingTypes';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';

interface RegistrationSettingsProps {
    consultingTypeId: string;
}

export const RegistrationSettings = ({ consultingTypeId }: RegistrationSettingsProps) => {
    const { t } = useTranslation();
    const { id } = useParams();
    const postCodeRangesActive = Form.useWatch('postCodeRangesActive');
    const { data: hasConsultants, isLoading } = useAgencyHasConsultants({ id });
    const [showAutoselectPostcodeWarning, setShowAutoselectPostcodeWarning] = useState(false);
    const { isEnabled } = useFeatureContext();

    useEffect(() => {
        if (!consultingTypeId || !isEnabled(FeatureFlag.ConsultingTypesForAgencies)) {
            setShowAutoselectPostcodeWarning(false);
            return;
        }

        getConsultingTypes()
            .then((cTypes) => {
                const consultingType = cTypes.find((cType) => cType.id === consultingTypeId);
                setShowAutoselectPostcodeWarning(consultingType?.registration.autoSelectPostcode);
            })
            .catch((error) => {
                console.error('Failed to fetch consulting types:', error);
                // Don't show warning if consulting types can't be fetched
                setShowAutoselectPostcodeWarning(false);
            });
    }, [consultingTypeId, isEnabled]);

    return (
        <Card titleKey="agency.form.registrationSettings.title" isLoading={isLoading}>
            {!hasConsultants && (
                <Alert
                    className={styles.warning}
                    type="warning"
                    description={t('agency.form.registrationSettings.onlineWarning')}
                />
            )}
            <FormSwitchField
                inline
                className={styles.switch}
                labelKey="agency.form.registrationSettings.onlineDescription"
                name="online"
                disableLabels
                disabled={id === 'add' || !hasConsultants}
            />
            <Divider />

            {showAutoselectPostcodeWarning && (
                <Alert
                    className={styles.warning}
                    type="warning"
                    description={t('agency.form.registrationSettings.autoSelectPostcodeWarning')}
                />
            )}

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
        </Card>
    );
};
