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
import { useAgencyData } from '../../../../../hooks/useAgencyData';
import { useConsultantsOrAdminsData } from '../../../../../hooks/useConsultantsOrAdminsData';
import { PostCodeRanges } from './PostCodeRanges';
import styles from './styles.module.scss';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { isActiveRecord } from '../../../../../utils/deleteDate';
import { CreateConsultantModal } from '../../../../../components/CreateConsultantModal';
import { parseUserAuthInfo } from '../../../../../utils/parseUserAuthInfo';
import { resolveAgencyTenantId } from '../../../../../api/agency/addAgencyData';
import { normalizeTopicIds } from '../../../../../api/agency/normalizeTopicIds';
import { isConsultantSectionVisible, mayBeVisibleInRegistration } from './consultantSection';

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

    const hasPersistedAgency = id !== 'add' && Number.isFinite(Number(id)) && Number(id) > 0;
    // Visible on a saved agency even outside edit mode: an agency that already has
    // counsellors used to show nothing about them until the card was switched to edit.
    const showConsultantAssignment = isConsultantSectionVisible({
        asFields,
        editing,
        hasPersistedAgency,
        hasTenant: true,
    });
    const { data: hasConsultants, isLoading } = useAgencyHasConsultants({ id });
    // Already in the query cache — the page reads the same key, so this adds no request.
    const { data: agency } = useAgencyData({ id });
    const { data: consultants, isLoading: isLoadingConsultants } = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        search: '*',
        pageSize: 1000,
        enabled: showConsultantAssignment,
    });
    // Superadmins pick the tenant in the form; tenant admins carry it in their token.
    const consultantTenantId = resolveAgencyTenantId(selectedTenantId, parseUserAuthInfo().tenantId);
    const consultantOptions = useMemo(() => {
        // A platform admin's consultant search spans tenants and the backend stores a
        // cross-tenant agency assignment without rejecting it, so scope the list to the
        // agency's tenant. An unknown tenant leaves it unfiltered rather than emptying
        // the picker — same rule as the supervisor picker in users/Edit.
        const assignable = (consultants?.data || []).filter(
            (consultant) =>
                isActiveRecord(consultant) &&
                (consultantTenantId === undefined || String(consultant.tenantId) === String(consultantTenantId)),
        );

        return convertToOptions(assignable, ['firstname', 'lastname', 'email'], 'id');
    }, [consultants?.data, consultantTenantId]);
    // One rule for both screens. A selection counts because saving assigns it, which is what
    // the hint on this card promises; the backend count covers counsellors attached earlier.
    const mayGoOnline = mayBeVisibleInRegistration({
        hasAssignedConsultants: hasConsultants,
        hasSelectedConsultants,
        // The stored state, not the form value the admin may have just toggled.
        isAlreadyVisible: Boolean(agency?.id) && !agency?.offline,
    });
    const needsConsultantAssignment = !mayGoOnline;

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

    // Narrowing the options does not narrow the selection: MuiSelectField keeps a value it
    // cannot resolve, so a counsellor picked before the tenant was known would still be
    // submitted and assigned. Drop what the tenant no longer allows — but only once the
    // search has answered, or a pending query would read as an empty list and wipe a valid pick.
    useEffect(() => {
        if (isLoadingConsultants || !consultants?.data) {
            return;
        }
        const allowed = new Set(consultantOptions.map(({ value }) => String(value)));
        const current = form.getFieldValue('consultantIds') || [];
        const kept = current.filter((entry) =>
            allowed.has(String(entry !== null && typeof entry === 'object' ? entry?.value : entry)),
        );

        if (kept.length !== current.length) {
            form.setFieldValue('consultantIds', kept);
        }
    }, [consultantOptions, consultants?.data, form, isLoadingConsultants]);

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
            {/* Not disabled: the switch reacts and names the missing counsellor on submit. */}
            <MuiSwitchField
                label={t('agency.form.registrationSettings.onlineDescription')}
                name="online"
                rules={[
                    {
                        validator: (_rule, value) =>
                            value && needsConsultantAssignment
                                ? Promise.reject(new Error(t('agency.form.registrationSettings.onlineNeedsConsultant')))
                                : Promise.resolve(),
                    },
                ]}
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
