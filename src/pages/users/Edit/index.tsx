import { Alert, Button, message, Space, Col, Row, Form } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import { Card } from '../../../components/Card';
import { MuiFormField } from '../../../components/mui/MuiFormField';
import {
    ConsultantPersonalFields,
    ConsultantSettingsFields,
    type ConsultantFieldName,
} from '../../../components/ConsultantFields';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { Page } from '../../../components/Page';
import { MuiSelectField, Option } from '../../../components/mui/MuiSelectField';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useAddOrUpdateConsultantOrAdmin } from '../../../hooks/useAddOrUpdateConsultantOrAgencyAdmin';
import { useAgenciesData } from '../../../hooks/useAgencysData';
import { useConsultantsOrAdminsData } from '../../../hooks/useConsultantsOrAdminsData';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { convertToOptions } from '../../../utils/convertToOptions';
import { decodeUsername } from '../../../utils/encryptionHelpers';
import styles from './styles.module.scss';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { UserRole } from '../../../enums/UserRole';
import { parseUserAuthInfo } from '../../../utils/parseUserAuthInfo';
import { searchTenantData } from '../../../api/tenant/searchTenantData';
import { getSingleTenantData } from '../../../api/tenant/getSingleTenantData';
import { createUserSaveErrorHandler } from '../../../utils/userSaveErrorHandler';
import { findUncoveredTopics } from '../../../utils/topicAgencyCoverage';
import { CounselorData } from '../../../types/counselor';
import { useTenantTopics } from '../../../hooks/useTenantTopics';
import { useCounselorById } from '../../../hooks/useCounselorById';
import { GrantConsultantIdentityModal } from '../../../components/GrantConsultantIdentityModal';
import { CreateAgencyModal } from '../../../components/CreateAgencyModal';
import { resolveAgencyTenantId } from '../../../api/agency/addAgencyData';
import { isActiveDeleteDate } from '../../../utils/deleteDate';
import { canGrantConsultantIdentity } from '../../../utils/canGrantConsultantIdentity';
import { focusFirstInvalidField } from '../../../utils/formErrorNavigation';

/**
 * antd prefixes every bound control id with the form name, and
 * `focusFirstInvalidField` resolves that same id. Keep them in lockstep.
 */
const FORM_NAME = 'consultantOrAdmin';

/**
 * The standing-supervisor picker needs every eligible colleague in one list, so it reads the
 * consultant search in a single page rather than paginating a dropdown. Bounded on purpose:
 * far above any realistic tenant, far below "fetch the world".
 */
const SUPERVISOR_CANDIDATE_PAGE_SIZE = 1000;

/**
 * A standing supervisor has to be an account that can still work. Read the raw fields rather than
 * `resolveDisplayStatus`: that helper answers "what badge does the user table show", and it
 * returns ABSENT before it ever looks at whether the account is disabled — so a colleague who is
 * both absent AND disabled would read as merely absent and slip through.
 *
 * Absence alone stays assignable on purpose. It is temporary, and ADR-008 is explicit that
 * supervision simply lapses while the supervisor is away rather than blocking anything.
 */
const isAssignableSupervisor = (candidate: CounselorData): boolean =>
    candidate.active !== false && candidate.status !== 'INACTIVE' && candidate.status !== 'IN_DELETION';

const mergeTopicOptions = (current: Option[], incoming: Option[]): Option[] => {
    const seen = new Set(current.map(({ value }) => value));
    return [...current, ...incoming.filter(({ value }) => !seen.has(value))];
};

/**
 * The counsellor profile (#994/#996/#1046). An agency admin has none of it —
 * the record does not carry these columns — so this whole group drops out when
 * the form is editing an admin rather than a consultant.
 */
const CONSULTANT_ONLY_PROFILE_FIELDS: ConsultantFieldName[] = [
    'displayName',
    'internalDisplayName',
    'avatar',
    'salutation',
    'position',
    'title',
    'adminRemarks',
];

/**
 * Temporarily hidden on THIS screen, unchanged from before the field set was
 * shared: absence is driven from the counsellor's own profile, and group chats
 * wait on the GroupChatV2 flag. The quick-create dialog offers both, because
 * `addCounselorData` carries them — which is exactly the kind of difference
 * that has to be written down rather than discovered.
 */
const PAGE_SETTINGS_EXCLUSIONS: ConsultantFieldName[] = ['absent', 'isGroupchatConsultant'];

export const UserEditOrAdd = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const { can } = useUserPermissions();
    const { t } = useTranslation();
    const { isSuperAdmin, hasRole } = useUserRoles();
    // Mirrors the backend gate (AuthenticatedUser#hasTenantLevelAdminRole): remarks are
    // tenant-level-admin only. For any other role the field is omitted entirely — the
    // caller could neither read nor write it.
    const canManageAdminRemarks = hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin]);

    const { typeOfUsers, id } = useParams<{ id: string; typeOfUsers: TypeOfUser }>();
    const isEditing = id !== 'add';
    const isConsultantForm = typeOfUsers === TypeOfUser.Consultants;
    const { data: consultantsResponse, isLoading: isLoadingConsultants } = useConsultantsOrAdminsData({
        search: id,
        typeOfUser: typeOfUsers,
        enabled: isEditing && !!id,
    });
    const { data: agenciesData, isLoading } = useAgenciesData({ pageSize: 10000 });
    const { data: topics, isLoading: isLoadingTopics } = useTenantTopics(true);
    const { data: consultantById, isLoading: isLoadingConsultantById } = useCounselorById({
        id: isEditing && isConsultantForm ? id : undefined,
    });
    const singleData = consultantsResponse?.data.find((c) => c.id === id);
    /**
     * ADR-008 "Supervision (auto-assigned)": an agency admin points a counsellor at one standing
     * supervisor, who is then attached read-only to every case that counsellor accepts. Editing
     * only — `CreateConsultantDTO` carries no such field, the counsellor must exist first.
     */
    const showStandingSupervisor = isConsultantForm && isEditing;
    const {
        data: supervisorCandidatesResponse,
        isLoading: isLoadingSupervisorCandidates,
        isError: supervisorCandidatesFailed,
    } = useConsultantsOrAdminsData({
        typeOfUser: TypeOfUser.Consultants,
        pageSize: SUPERVISOR_CANDIDATE_PAGE_SIZE,
        enabled: showStandingSupervisor,
        // Without this the search resolves to an empty list on a 500, so "nobody is eligible"
        // would be indistinguishable from "the API is down" — the admin would be told there is
        // nobody to pick while the outage stays invisible.
        rethrowOnFailure: true,
    });
    const showGrantConsultantIdentity = canGrantConsultantIdentity(isEditing, typeOfUsers, singleData);
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted] = useState(false);
    const [tenantsData, setTenantsData] = useState([]);
    const [userTenantId, setUserTenantId] = useState<number>(0);
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    const selectedTenant = Form.useWatch('tenantId', form);
    const selectedAgencies = Form.useWatch('agencies', form) || [];
    const selectedTopicIds = Form.useWatch('topicIds', form) || [];
    const publicSlug = Form.useWatch('publicSlug', form);
    const pendingPublicSlug = Form.useWatch('pendingPublicSlug', form);
    const publicSlugStatus = Form.useWatch('publicSlugStatus', form);
    const prevAgencyIdsRef = useRef<string[] | null>(null);
    /**
     * Whether the ADMIN changed the standing supervisor, as opposed to us syncing it from a
     * refetch. antd's `isFieldTouched` cannot tell the two apart — `setFieldsValue` marks the
     * field touched too — and conflating them is what makes an unrelated save start writing a
     * value nobody chose. `onValuesChange` fires only for user-driven changes, so this ref is the
     * honest signal.
     */
    const supervisorPickedByAdminRef = useRef(false);
    const topicsForList = topics?.filter((topic) => !selectedTopicIds.find(({ value }) => value === `${topic.id}`));
    const topicOptions = [
        ...selectedTopicIds.filter((selected) => !topics?.some((topic) => `${topic.id}` === selected.value)),
        ...convertToOptions(topicsForList, 'name', 'id'),
    ];
    /**
     * Read the standing supervisor from the single-consultant record, not from the list row.
     * The form's list comes from `/service/users/consultants/search`, which leaves
     * `assignedSupervisorId` null; only `GET /useradmin/consultants/{id}` fills it. Sourcing it
     * from the list row would make a saved assignment look forgotten after every reload. Same
     * `consultantById` first, list row second order the public-slug fields already use.
     */
    const storedSupervisorId = consultantById?.assignedSupervisorId ?? singleData?.assignedSupervisorId;
    const editedTenantId = consultantById?.tenantId ?? singleData?.tenantId;
    /**
     * Only the single-consultant record carries the current assignment, so without it we do not
     * know what is stored. Writing the field then would send '' on any unrelated edit and silently
     * clear a supervisor the admin never touched, so the field is read-only and stays out of the
     * payload until that record is available.
     */
    const canWriteStandingSupervisor = showStandingSupervisor && !!consultantById;
    const supervisorOptions = useMemo(() => {
        const candidates = supervisorCandidatesResponse?.data || [];
        // The backend rejects a target that is not itself a supervisor, or the counsellor
        // themselves — so never offer either.
        // A platform admin's consultant search spans tenants, so `isSupervisor` alone would offer
        // colleagues from a foreign tenant. The backend does not reject that today — it stores the
        // assignment and the attach then fails silently at accept time, which looks configured but
        // never supervises anything. Scope the list when we know the edited consultant's tenant;
        // for tenant-scoped admins the search is already narrowed, so an unknown tenant is left
        // unfiltered rather than emptying the list.
        const eligible = candidates.filter(
            (candidate) =>
                candidate.isSupervisor &&
                candidate.id !== id &&
                // A disabled or pending-deletion colleague keeps the capability flag but cannot
                // take on oversight. Offering them yields an assignment that supervises nothing.
                isAssignableSupervisor(candidate) &&
                (editedTenantId === undefined || String(candidate.tenantId) === String(editedTenantId)),
        );
        const options = convertToOptions(eligible, ['firstname', 'lastname'], 'id');

        if (!storedSupervisorId || options.some(({ value }) => value === storedSupervisorId)) {
            return options;
        }
        // The stored supervisor no longer qualifies (capability withdrawn, account disabled or on
        // its way out). Keep it VISIBLE so the admin sees the stale assignment and can correct it
        // instead of it silently disappearing — but not selectable, or they could switch away and
        // pick it straight back, storing an assignment that supervises nothing.
        const stored = candidates.find((candidate) => candidate.id === storedSupervisorId);
        return [
            ...options,
            {
                label: stored ? `${stored.firstname} ${stored.lastname}` : storedSupervisorId,
                value: storedSupervisorId,
                disabled: true,
            },
        ];
    }, [supervisorCandidatesResponse, id, storedSupervisorId, editedTenantId]);

    /**
     * The candidate list is one page deep. A tenant with more consultants than that would silently
     * hide eligible supervisors on later pages, so say it rather than presenting a short list as
     * if it were complete. Proper server-side search is the real answer and is out of scope here.
     */
    const supervisorCandidatesTruncated = (supervisorCandidatesResponse?.total ?? 0) > SUPERVISOR_CANDIDATE_PAGE_SIZE;

    /**
     * Ordered by what actually blocks the admin. Anything that LOCKS the field outranks a note
     * about the list being incomplete: telling someone the search is capped, while the real reason
     * they cannot edit is that the stored value could not be read, sends them looking in the wrong
     * place entirely.
     */
    const standingSupervisorHelpKey = (() => {
        if (supervisorCandidatesFailed) {
            return 'counselor.assignedSupervisor.loadFailed';
        }
        if (!canWriteStandingSupervisor) {
            return 'counselor.assignedSupervisor.detailsUnavailable';
        }
        if (supervisorCandidatesTruncated) {
            return 'counselor.assignedSupervisor.truncated';
        }
        return supervisorOptions.length === 0
            ? 'counselor.assignedSupervisor.noCandidates'
            : 'counselor.assignedSupervisor.hint';
    })();

    const hasSelectedAgencies = selectedAgencies.length > 0;
    const consultantTopics = consultantById?.topics || [];
    const showTopicsField =
        isConsultantForm &&
        topics?.length > 0 &&
        (hasSelectedAgencies || (isEditing && consultantTopics.length > 0) || selectedTopicIds.length > 0);

    useEffect(() => {
        const { tenantId = 0 } = parseUserAuthInfo();
        setUserTenantId(tenantId);

        if (isSuperAdmin) {
            searchTenantData({ perPage: 1000 }).then(({ data }) => setTenantsData(data));
        } else if (tenantId > 0) {
            getSingleTenantData(tenantId).then((data) => {
                setTenantsData([data]);
                form.setFieldsValue({ tenantId: tenantId.toString() });
            });
        }
    }, []);

    useEffect(() => {
        const filterAgenciesByTenantId = ({ data = [], tenantId }) => {
            if (!tenantId) return [];
            return data?.filter(
                ({ deleteDate, tenantId: agencyTenantId }) =>
                    isActiveDeleteDate(deleteDate) && agencyTenantId === parseInt(tenantId, 10),
            );
        };

        setFilteredAgencies(filterAgenciesByTenantId({ data: agenciesData?.data, tenantId: selectedTenant }));
    }, [agenciesData, selectedTenant]);

    useEffect(() => {
        if (isEditing) return;
        form.setFieldValue('agencies', []);
        form.setFieldValue('topicIds', []);
        prevAgencyIdsRef.current = [];
    }, [selectedTenant, isEditing]);

    useEffect(() => {
        if (!isConsultantForm || !hasSelectedAgencies) {
            if (!isEditing) {
                form.setFieldValue('topicIds', []);
            }
            prevAgencyIdsRef.current = hasSelectedAgencies ? prevAgencyIdsRef.current : [];
            return;
        }

        const currentAgencyIds = selectedAgencies.map(({ value }) => String(value));

        if (prevAgencyIdsRef.current === null && isEditing) {
            prevAgencyIdsRef.current = currentAgencyIds;
            return;
        }

        const newlyAddedAgencyIds = currentAgencyIds.filter(
            (agencyId) => !(prevAgencyIdsRef.current || []).includes(agencyId),
        );
        prevAgencyIdsRef.current = currentAgencyIds;

        if (newlyAddedAgencyIds.length === 0) {
            return;
        }

        const newAgencyTopics = filteredAgencies
            .filter((agency) => newlyAddedAgencyIds.includes(String(agency.id)))
            .flatMap((agency) => agency.topics || []);

        if (newAgencyTopics.length === 0) {
            return;
        }

        const currentTopicIds: Option[] = form.getFieldValue('topicIds') || [];
        form.setFieldValue(
            'topicIds',
            mergeTopicOptions(currentTopicIds, convertToOptions(newAgencyTopics, 'name', 'id')),
        );
    }, [selectedAgencies, filteredAgencies, isConsultantForm, hasSelectedAgencies, isEditing, form]);

    useEffect(() => {
        if (!isEditing || !isConsultantForm || !consultantById?.topics?.length) {
            return;
        }

        form.setFieldsValue({
            topicIds: convertToOptions(consultantById.topics, 'name', 'id'),
        });
        prevAgencyIdsRef.current = (form.getFieldValue('agencies') || []).map(({ value }) => String(value));
    }, [consultantById, isEditing, isConsultantForm, form]);

    // Personal-info fields (#994) are only served by the get-by-id endpoint, not by the
    // search result the rest of the form prefills from.
    useEffect(() => {
        if (!isEditing || !isConsultantForm || !consultantById) {
            return;
        }

        form.setFieldsValue({
            displayName: consultantById.displayName || '',
            internalDisplayName: consultantById.internalDisplayName || '',
            salutation: consultantById.salutation || undefined,
            position: consultantById.position || '',
            title: consultantById.title || '',
            // #1046: both stay undefined for a consultant who never chose, so an
            // untouched form omits them and the backend keeps whatever it has.
            avatarKind: consultantById.avatarKind || undefined,
            avatarId: consultantById.avatarId || undefined,
            ...(canManageAdminRemarks ? { adminRemarks: consultantById.adminRemarks || '' } : {}),
            // The standing supervisor comes from the same record and belongs in the same sync.
            // antd applies `initialValues` once, at mount, and this query is invalidated on every
            // save — so without this the selector would keep showing what the form mounted with
            // while the backend already held another. Never over a field the admin has touched:
            // their edit beats a background refetch.
            ...(supervisorPickedByAdminRef.current
                ? {}
                : { assignedSupervisorId: consultantById.assignedSupervisorId || undefined }),
        });
    }, [consultantById, isEditing, isConsultantForm, canManageAdminRemarks, form]);

    const { mutate } = useAddOrUpdateConsultantOrAdmin({
        id: isEditing ? id : null,
        typeOfUser: typeOfUsers,
        onSuccess: (response) => {
            const messagePrefix = isConsultantForm ? 'counselor' : 'agencyAdmin';
            message.success({
                content: t(`message.${messagePrefix}.${isEditing ? 'update' : 'add'}`),
                duration: 3,
            });

            if (!isEditing && (response as { agencyAssignmentFailed?: boolean })?.agencyAssignmentFailed) {
                message.warning({
                    content: t('message.agencyAdmin.agencyAssignmentFailed'),
                    duration: 8,
                });
            }

            navigate(`/admin/users/${typeOfUsers}`);
        },
        onError: createUserSaveErrorHandler({
            t,
            notifyError: (content) => message.error({ content, duration: 8 }),
            canReassignExistingEmail:
                can(PermissionAction.Delete, Resource.Consultant) && typeOfUsers === TypeOfUser.Consultants,
        }),
    });

    // Mirror the backend ADR-003 rule (ConsultantTopicAgencyCompatibilityValidator):
    // every selected topic must be offered by at least one selected agency. Catching this
    // here means we name the mismatch instead of relying on the assignment request, which
    // the backend used to swallow silently.
    const onSave = useCallback(
        (data) => {
            if (isConsultantForm) {
                const uncoveredTopics = findUncoveredTopics(
                    data.agencies ?? [],
                    data.topicIds ?? [],
                    filteredAgencies || [],
                );
                if (uncoveredTopics.length > 0) {
                    form.setFields([
                        {
                            name: 'topicIds',
                            errors: [
                                t('message.error.topicsNotCoveredByAgencies', {
                                    topics: uncoveredTopics.map(({ label }) => label).join(', '),
                                }),
                            ],
                        },
                    ]);
                    return;
                }
            }
            // Write the standing supervisor ONLY when the admin deliberately changed it. Anything
            // else — the field read-only because the record was unreadable, or the form mounted
            // from a stale detail cache — would mean submitting a value we did not actually know,
            // and since '' means "clear it" to the backend, an unrelated edit could silently drop
            // a supervisor nobody touched. Omitted, the backend leaves the assignment alone.
            if (!canWriteStandingSupervisor || !supervisorPickedByAdminRef.current) {
                const payloadWithoutSupervisor = { ...data };
                delete payloadWithoutSupervisor.assignedSupervisorId;
                mutate(payloadWithoutSupervisor);
                return;
            }
            // `MuiSelectField` emits `undefined` when the admin clears it, but the backend reads
            // undefined as "leave the assignment untouched" — only '' clears it. Without this
            // coercion a standing supervisor could be set but never removed.
            mutate({ ...data, assignedSupervisorId: data.assignedSupervisorId ?? '' });
        },
        [isConsultantForm, filteredAgencies, form, mutate, t, canWriteStandingSupervisor],
    );
    const onFinishFailed = useCallback(({ errorFields }: ValidateErrorEntity) => {
        // Keep values; jump to the field that blocked save (#717 / #594.6).
        focusFirstInvalidField(errorFields, FORM_NAME);
    }, []);
    const onCancel = useCallback(() => navigate(`/admin/users/${typeOfUsers}`), []);
    /*
     * This screen and the agency screen's quick-create dialog render ONE field
     * set (src/components/ConsultantFields). What this surface does not offer
     * is stated here rather than left out, so the two never drift apart by
     * accident again.
     */
    const personalFieldExclusions = useMemo<ConsultantFieldName[]>(() => {
        const excluded = new Set<ConsultantFieldName>();

        if (!isConsultantForm) {
            CONSULTANT_ONLY_PROFILE_FIELDS.forEach((field) => excluded.add(field));
        }
        // Mirrors the backend gate (AuthenticatedUser#hasTenantLevelAdminRole).
        if (!canManageAdminRemarks) {
            excluded.add('adminRemarks');
        }
        // Credentials are set once, at creation, and only for account types that
        // have a login. Afterwards they are changed through the reset flow.
        if (isEditing || (typeOfUsers !== TypeOfUser.Consultants && typeOfUsers !== TypeOfUser.AgencyAdmins)) {
            excluded.add('password');
            excluded.add('passwordConfirmation');
        }

        return [...excluded];
    }, [isConsultantForm, canManageAdminRemarks, isEditing, typeOfUsers]);
    const activePublicSlug = publicSlug || consultantById?.publicSlug;
    const pendingSlug = pendingPublicSlug || consultantById?.pendingPublicSlug;
    const slugStatus = publicSlugStatus || consultantById?.publicSlugStatus;
    let publicSlugAlertType: 'info' | 'success' | 'warning' = 'info';
    let publicSlugAlertDescription = t('counselor.publicSlug.status.empty');

    if (pendingSlug) {
        publicSlugAlertType = 'warning';
        publicSlugAlertDescription = t('counselor.publicSlug.status.pending', { slug: pendingSlug });
    } else if (slugStatus === 'REJECTED') {
        publicSlugAlertDescription = t('counselor.publicSlug.status.rejected');
    } else if (activePublicSlug) {
        publicSlugAlertType = 'success';
        publicSlugAlertDescription = t('counselor.publicSlug.status.active', { slug: activePublicSlug });
    }

    const approvePendingPublicSlug = () => {
        form.setFieldsValue({
            publicSlug: pendingSlug,
            rejectPendingPublicSlug: false,
        });
        form.submit();
    };

    const rejectPendingPublicSlug = () => {
        form.setFieldsValue({
            rejectPendingPublicSlug: true,
        });
        form.submit();
    };

    // Superadmins pick the tenant in the form; other admins carry it in their token.
    const agencyTenantId = resolveAgencyTenantId(selectedTenant, userTenantId);

    const onAgencyCreated = (agency) => {
        const current = form.getFieldValue('agencies') || [];
        form.setFieldValue('agencies', [
            ...current,
            {
                value: String(agency.id),
                label: [agency.postcode, agency.name, agency.city].filter(Boolean).join(' '),
            },
        ]);
    };

    return (
        <Page isLoading={isLoadingConsultants || isLoading || isLoadingTopics || isLoadingConsultantById} stickyHeader>
            <Page.BackWithActions path={`/admin/users/${typeOfUsers}`} titleKey="agency.add.general.headline">
                {showGrantConsultantIdentity && (
                    <GrantConsultantIdentityModal
                        adminId={id}
                        tenantId={singleData?.tenantId}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: [typeOfUsers.toUpperCase()] });
                            navigate(`/admin/users/${typeOfUsers}`);
                        }}
                    />
                )}
                {isReadOnly && (
                    <Button type="text" className="admin-m3-text-button" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && (
                    <>
                        <Button type="text" className="admin-m3-text-button" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button
                            type="text"
                            className="admin-m3-text-button"
                            onClick={() => form.submit()}
                            disabled={submitted}
                        >
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>

            <ThemeProvider theme={orisoMuiTheme}>
                <Form
                    disabled={isReadOnly}
                    labelAlign="left"
                    labelWrap
                    layout="vertical"
                    form={form}
                    name={FORM_NAME}
                    onFinish={onSave}
                    // Fires for user-driven changes only, never for `setFieldsValue` — the one
                    // signal that separates an admin's pick from a background sync.
                    onValuesChange={(changedValues) => {
                        if ('assignedSupervisorId' in changedValues) {
                            supervisorPickedByAdminRef.current = true;
                        }
                    }}
                    onFinishFailed={onFinishFailed}
                    initialValues={{
                        ...(singleData || {
                            formalLanguage: true,
                        }),
                        username: decodeUsername(singleData?.username || ''),
                        agencies: convertToOptions(singleData?.agencies || [], ['postcode', 'name', 'city'], 'id'),
                        topicIds: convertToOptions(consultantById?.topics || [], 'name', 'id'),
                        assignedSupervisorId: storedSupervisorId || undefined,
                        publicSlug: consultantById?.publicSlug || singleData?.publicSlug || '',
                        pendingPublicSlug: consultantById?.pendingPublicSlug || singleData?.pendingPublicSlug || '',
                        publicSlugStatus: consultantById?.publicSlugStatus || singleData?.publicSlugStatus || '',
                        rejectPendingPublicSlug: false,
                        tenantId:
                            singleData?.tenantId?.toString() || (userTenantId > 0 && userTenantId.toString()) || '',
                    }}
                >
                    <Row gutter={[20, 10]}>
                        <Col xs={24} lg={12}>
                            <Card titleKey="agency.edit.general.general_information">
                                <ConsultantPersonalFields
                                    exclude={personalFieldExclusions}
                                    disabled={isReadOnly}
                                    // The username IS the Keycloak identity; it cannot move once issued.
                                    usernameLocked={isEditing}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Space direction="vertical" size={20} className={styles.columnStack}>
                                <Card titleKey="settings.title">
                                    <MuiSelectField
                                        name="tenantId"
                                        placeholder="tenantAdmins.form.tenant"
                                        required
                                        disabled={isReadOnly || isEditing || !isSuperAdmin}
                                        className={styles.select}
                                        label="tenantAdmins.form.tenantAssignment"
                                        options={convertToOptions(tenantsData || [], 'name', 'id')}
                                    />

                                    <MuiSelectField
                                        name="agencies"
                                        label="agency"
                                        labelInValue
                                        isMulti
                                        placeholder="plsSelect"
                                        options={convertToOptions(filteredAgencies, ['postcode', 'name', 'city'], 'id')}
                                    />

                                    <div className={styles.createAgency}>
                                        <CreateAgencyModal
                                            tenantId={agencyTenantId}
                                            disabled={isReadOnly}
                                            onSuccess={onAgencyCreated}
                                        />
                                    </div>

                                    {showTopicsField && (
                                        <MuiSelectField
                                            label="topics.title"
                                            name="topicIds"
                                            labelInValue
                                            isMulti
                                            allowClear
                                            placeholder="plsSelect"
                                            options={topicOptions}
                                        />
                                    )}

                                    {isConsultantForm && (
                                        <ConsultantSettingsFields exclude={PAGE_SETTINGS_EXCLUSIONS}>
                                            {showStandingSupervisor && (
                                                <MuiSelectField
                                                    name="assignedSupervisorId"
                                                    label="counselor.assignedSupervisor"
                                                    placeholder="counselor.assignedSupervisor.placeholder"
                                                    help={standingSupervisorHelpKey}
                                                    options={supervisorOptions}
                                                    loading={isLoadingSupervisorCandidates}
                                                    // Disabled, not hidden: the admin should see
                                                    // that the assignment exists but cannot be
                                                    // edited right now, rather than the field
                                                    // vanishing.
                                                    disabled={!canWriteStandingSupervisor || supervisorCandidatesFailed}
                                                    allowClear
                                                />
                                            )}
                                        </ConsultantSettingsFields>
                                    )}
                                </Card>

                                {isConsultantForm && (
                                    <Card titleKey="counselor.publicSlug.status.title">
                                        <MuiFormField
                                            name="publicSlug"
                                            label={t('counselor.publicSlug')}
                                            placeholder={t('placeholder.publicSlug')}
                                            rules={[
                                                {
                                                    pattern: /^[a-z]+(-[a-z]+)*$/,
                                                    message: t('message.error.publicSlug.format'),
                                                },
                                            ]}
                                        />
                                        <Form.Item name="pendingPublicSlug" hidden>
                                            <input />
                                        </Form.Item>
                                        <Form.Item name="publicSlugStatus" hidden>
                                            <input />
                                        </Form.Item>
                                        <Form.Item name="rejectPendingPublicSlug" hidden>
                                            <input />
                                        </Form.Item>
                                        {isEditing && (
                                            <Alert
                                                type={publicSlugAlertType}
                                                showIcon
                                                message={t('counselor.publicSlug.status.title')}
                                                description={publicSlugAlertDescription}
                                            />
                                        )}
                                        {pendingSlug && (
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    disabled={isReadOnly}
                                                    onClick={approvePendingPublicSlug}
                                                >
                                                    {t('counselor.publicSlug.approve')}
                                                </Button>
                                                <Button disabled={isReadOnly} onClick={rejectPendingPublicSlug}>
                                                    {t('counselor.publicSlug.reject')}
                                                </Button>
                                            </Space>
                                        )}
                                    </Card>
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </ThemeProvider>
        </Page>
    );
};
