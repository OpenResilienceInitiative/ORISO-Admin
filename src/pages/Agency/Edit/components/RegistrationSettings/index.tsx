import { Alert, Divider, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Card } from '../../../../../components/Card';
import { MuiRadioGroupField } from '../../../../../components/mui/MuiRadioGroupField';
import { MuiSelectField } from '../../../../../components/mui/MuiSelectField';
import { MuiSwitchField } from '../../../../../components/mui/MuiSwitchField';
import { TypeOfUser } from '../../../../../enums/TypeOfUser';
import { useAgencyHasConsultants } from '../../../../../hooks/useAgencyHasConsultants';
import { useConsultantsOrAdminsData } from '../../../../../hooks/useConsultantsOrAdminsData';
import { PostCodeRanges } from './PostCodeRanges';
import styles from './styles.module.scss';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { isActiveRecord } from '../../../../../utils/deleteDate';
import { CreateConsultantModal } from '../../../../../components/CreateConsultantModal';
import { parseUserAuthInfo } from '../../../../../utils/parseUserAuthInfo';
import { resolveAgencyTenantId } from '../../../../../api/agency/addAgencyData';
import { normalizeTopicIds } from '../../../../../api/agency/normalizeTopicIds';

interface RegistrationSettingsProps {
    asFields?: boolean;
    editing?: boolean;
}

export const RegistrationSettings = ({ asFields, editing }: RegistrationSettingsProps) => {
    const { t } = useTranslation();
    const { id } = useParams();
    const form = Form.useFormInstance();
    const postCodeRangesActive = Form.useWatch('postCodeRangesActive');
    const selectedTenantId = Form.useWatch('tenantId') ?? form.getFieldValue('tenantId');
    const selectedTopicIds = Form.useWatch('topicIds') ?? form.getFieldValue('topicIds');
    const selectedConsultants = Form.useWatch('consultantIds') || [];
    const hasSelectedConsultants = selectedConsultants.length > 0;
    const showConsultantAssignment = !asFields || editing;
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
    // Superadmins pick the tenant in the form; tenant admins carry it in their token.
    const consultantTenantId = resolveAgencyTenantId(selectedTenantId, parseUserAuthInfo().tenantId);
    const hasPersistedAgency = id !== 'add' && Number.isFinite(Number(id)) && Number(id) > 0;

    const onConsultantCreated = (consultant) => {
        const current = form.getFieldValue('consultantIds') || [];
        form.setFieldValue('consultantIds', [
            ...current,
            {
                value: String(consultant.id),
                label: [consultant.firstname, consultant.lastname, consultant.email].filter(Boolean).join(' '),
            },
        ]);
    };

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
                <>
                    <MuiSelectField
                        name="consultantIds"
                        label="agency.form.registrationSettings.consultants.label"
                        labelInValue
                        isMulti
                        allowClear
                        loading={isLoadingConsultants}
                        placeholder="agency.form.registrationSettings.consultants.placeholder"
                        options={consultantOptions}
                    />
                    <div className={styles.createConsultant}>
                        <CreateConsultantModal
                            tenantId={consultantTenantId}
                            agencyId={hasPersistedAgency ? id : undefined}
                            topicIds={normalizeTopicIds(selectedTopicIds)}
                            disabled={!hasPersistedAgency}
                            disabledReasonKey={
                                hasPersistedAgency
                                    ? undefined
                                    : 'agency.form.registrationSettings.createConsultant.saveAgencyFirst'
                            }
                            onSuccess={onConsultantCreated}
                        />
                    </div>
                </>
            )}
            <MuiSwitchField
                label={t('agency.form.registrationSettings.onlineDescription')}
                name="online"
                disabled={needsConsultantAssignment}
            />
            <Divider />

            <MuiRadioGroupField
                className={styles.radioGroup}
                vertical
                labelKey="agency.form.registrationSettings.postCodeTitle"
                name="postCodeRangesActive"
            >
                <MuiRadioGroupField.Radio value={false}>
                    {t('agency.form.registrationSettings.allPostCode')}
                </MuiRadioGroupField.Radio>
                <MuiRadioGroupField.Radio value>
                    {t('agency.form.registrationSettings.onlySelectedPostCodes')}
                </MuiRadioGroupField.Radio>
            </MuiRadioGroupField>

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
