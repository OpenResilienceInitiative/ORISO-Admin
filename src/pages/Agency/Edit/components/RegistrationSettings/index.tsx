import { Alert, Divider, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef } from 'react';
import { Card } from '../../../../../components/Card';
import { M3Button } from '../../../../../components/M3Button';
import { MuiRadioGroupField } from '../../../../../components/mui/MuiRadioGroupField';
import { MuiSelectField } from '../../../../../components/mui/MuiSelectField';
import { MuiSwitchField } from '../../../../../components/mui/MuiSwitchField';
import { TypeOfUser } from '../../../../../enums/TypeOfUser';
import { useAgencyHasConsultants } from '../../../../../hooks/useAgencyHasConsultants';
import { useAgencyData } from '../../../../../hooks/useAgencyData';
import { useAgencyConsultants } from '../../../../../hooks/useAgencyConsultants';
import { useConsultantsOrAdminsData } from '../../../../../hooks/useConsultantsOrAdminsData';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { PostCodeRanges } from './PostCodeRanges';
import styles from './styles.module.scss';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { CreateConsultantModal } from '../../../../../components/CreateConsultantModal';
import { parseUserAuthInfo } from '../../../../../utils/parseUserAuthInfo';
import { resolveAgencyTenantId } from '../../../../../api/agency/addAgencyData';
import { normalizeTopicIds } from '../../../../../api/agency/normalizeTopicIds';
import { assignableConsultants, isConsultantSectionVisible, mayBeVisibleInRegistration } from './consultantSection';
import { AssignedConsultants } from './AssignedConsultants';

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
    // Superadmins pick the tenant in the form; tenant admins carry it in their token.
    const { isSuperAdmin } = useUserRoles();
    const consultantTenantId = resolveAgencyTenantId(selectedTenantId, parseUserAuthInfo().tenantId);
    // A platform admin must choose the Träger first; until then nobody is offered (#953).
    const awaitingTenant = isSuperAdmin && consultantTenantId === undefined;
    const {
        data: consultants,
        isLoading: isLoadingConsultants,
        isError: consultantSearchFailed,
        refetch: retryConsultantSearch,
    } = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        search: '*',
        pageSize: 1000,
        // A failed lookup must reject, or it reads as "this Träger has no counsellors".
        rethrowOnFailure: true,
        // The server narrows to the Träger too, so other Träger's counsellors never reach the browser.
        filters: consultantTenantId === undefined ? {} : { tenantId: String(consultantTenantId) },
        enabled: showConsultantAssignment && !awaitingTenant,
    });
    // Same query key as the assigned list below, so this costs no extra request.
    const { data: assignedConsultants } = useAgencyConsultants({ id, enabled: hasPersistedAgency });
    const consultantOptions = useMemo(() => {
        // Already assigned people are listed as chips above the picker, not offered again.
        const assignedIds = new Set((assignedConsultants || []).map(({ id: consultantId }) => String(consultantId)));
        const assignable = assignableConsultants({
            consultants: consultants?.data || [],
            assignedIds,
            tenantId: consultantTenantId,
            requiresTenant: Boolean(isSuperAdmin),
        });

        return convertToOptions(assignable, ['firstname', 'lastname', 'email'], 'id');
    }, [assignedConsultants, consultants?.data, consultantTenantId, isSuperAdmin]);
    const noConsultantsInTenant =
        !awaitingTenant &&
        !isLoadingConsultants &&
        !consultantSearchFailed &&
        !!consultants?.data &&
        consultantOptions.length === 0;
    // One rule for both screens. A selection counts because saving assigns it, which is what
    // the hint on this card promises; the backend count covers counsellors attached earlier.
    const mayGoOnline = mayBeVisibleInRegistration({
        hasAssignedConsultants: hasConsultants,
        hasSelectedConsultants,
        // The stored state, not the form value the admin may have just toggled.
        isAlreadyVisible: Boolean(agency?.id) && !agency?.offline,
    });
    const needsConsultantAssignment = !mayGoOnline;

    let consultantHelpKey: string | undefined;
    if (awaitingTenant) {
        consultantHelpKey = 'agency.form.registrationSettings.consultants.selectTenantFirst';
    } else if (noConsultantsInTenant) {
        consultantHelpKey = 'agency.form.registrationSettings.consultants.noneInTenant';
    }

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

    // A pick belongs to the Träger it was made for. MuiSelectField keeps a value it cannot
    // resolve, and the new Träger's search may still be pending or may fail, so waiting for its
    // answer would let the old Träger's counsellor be saved (and assigned) for the new one.
    // Clear on the change itself. The first choice (nothing before it) and a refetch of the same
    // Träger leave the selection alone.
    const previousTenantId = useRef(consultantTenantId);
    useEffect(() => {
        const before = previousTenantId.current;
        previousTenantId.current = consultantTenantId;
        if (before !== undefined && String(before) !== String(consultantTenantId)) {
            const current = form.getFieldValue('consultantIds') || [];
            if (current.length > 0) {
                form.setFieldValue('consultantIds', []);
            }
        }
    }, [consultantTenantId, form]);

    // Narrowing the options does not narrow the selection either: drop what the chosen Träger
    // does not list — but only once its search has answered: a pending or failed query has no
    // list, and reading that as "nobody is allowed" would wipe picks that are still valid.
    useEffect(() => {
        if (isLoadingConsultants || consultantSearchFailed || !consultants?.data) {
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
    }, [consultantOptions, consultants?.data, consultantSearchFailed, form, isLoadingConsultants]);

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
                    {hasPersistedAgency && <AssignedConsultants agencyId={id} editing={Boolean(editing)} />}
                    <MuiSelectField
                        name="consultantIds"
                        label="agency.form.registrationSettings.consultants.label"
                        labelInValue
                        isMulti
                        allowClear
                        loading={isLoadingConsultants}
                        disabled={awaitingTenant}
                        help={consultantHelpKey}
                        placeholder="agency.form.registrationSettings.consultants.placeholder"
                        options={consultantOptions}
                    />
                    {consultantSearchFailed && !awaitingTenant && (
                        <Alert
                            className={styles.warning}
                            type="error"
                            description={t('agency.form.registrationSettings.consultants.loadError')}
                            action={
                                <M3Button variant="text" onClick={() => retryConsultantSearch()}>
                                    {t('agency.form.registrationSettings.consultants.retry')}
                                </M3Button>
                            }
                        />
                    )}
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
