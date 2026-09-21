import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { FETCH_ERRORS } from '../../api/fetchData';
import { agencyIdAllocationClient, type IdAllocationClient } from '../../api/idAllocation/idAllocation';
import {
    createSelfAssignment,
    listSelfAssignments,
    type SelfAssignmentRequest,
    type SelfAssignmentResult,
    type SelfAssignmentRole,
    type SelfAssignments,
} from '../../api/accountInvites/selfAssignments';
import { FloatingLabelSelect } from '../../components/FloatingLabelSelect';
import {
    IdAllocationField,
    useIdAllocation,
    type IdUnitOption,
    type IdUnitSearch,
} from '../../components/IdAllocationField';
import { Modal } from '../../components/Modal';
import { extractApiErrorMessageOrNull } from '../../utils/extractApiErrorMessage';
import { inviteConflictReasonKey, ROLE_LABEL_KEYS, type InviteViewerScope } from './inviteModel';
import styles from './selfAssignDialog.module.scss';

/** One topic (Fachbereich) of the chosen agency. */
export interface SelfAssignTopic {
    id: number;
    name: string;
}

export interface SelfAssignDialogProps {
    /** Who assigns themselves: agency admins may only become counsellors (#1026 role rule). */
    viewerScope: InviteViewerScope;
    /** Preselected Beratungsstelle — the existing one chosen in the invite bar, if any. */
    initialAgency?: IdUnitOption;
    /** Type-ahead over the agencies the viewer may see (the invite bar's own search). */
    searchAgencies?: IdUnitSearch;
    /** Topics of an agency; a counsellor joining an agency with several topics must pick at least one. */
    loadAgencyTopics: (agencyId: number) => Promise<SelfAssignTopic[]>;
    /** Injectable for stories/tests; default = the real UserService endpoints (#1215). */
    assign?: (request: SelfAssignmentRequest) => Promise<SelfAssignmentResult>;
    loadAssignments?: () => Promise<SelfAssignments>;
    agencyIdAllocation?: IdAllocationClient;
    onClose: () => void;
    /** Called after a successful assignment (e.g. to refresh lists). */
    onAssigned?: (result: SelfAssignmentResult) => void;
}

const rolesFor = (viewerScope: InviteViewerScope): SelfAssignmentRole[] =>
    viewerScope === 'agency' ? ['COUNSELLOR'] : ['COUNSELLOR', 'AGENCY_ADMIN'];

/**
 * "Mich selbst eintragen" (#1026 slice 3, UserService#1215): the signed-in
 * admin takes a role in a Beratungsstelle with their EXISTING account — no
 * e-mail invite. Träger admins may become counsellor or BST-Admin in their own
 * Träger, agency admins counsellor of their own agencies. The dialog also
 * lists where the admin is already entered, so a second click is not a guess.
 */
export const SelfAssignDialog = ({
    viewerScope,
    initialAgency,
    searchAgencies,
    loadAgencyTopics,
    assign = createSelfAssignment,
    loadAssignments = listSelfAssignments,
    agencyIdAllocation,
    onClose,
    onAssigned,
}: SelfAssignDialogProps) => {
    const { t } = useTranslation();
    const roles = rolesFor(viewerScope);
    const [role, setRole] = useState<SelfAssignmentRole>(roles[0]);
    const agency = useIdAllocation({
        client: agencyIdAllocation ?? agencyIdAllocationClient,
        initialUnit: initialAgency,
    });
    const agencyId = agency.mode === 'existing' ? agency.value : undefined;
    const [topics, setTopics] = useState<SelfAssignTopic[] | null>(null);
    const [topicIds, setTopicIds] = useState<number[]>([]);
    const [assignments, setAssignments] = useState<SelfAssignments | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAssignments()
            .then(setAssignments)
            .catch(() => setAssignments(null));
    }, [loadAssignments]);

    useEffect(() => {
        setTopics(null);
        setTopicIds([]);
        setError(null);
        if (agencyId == null) return undefined;
        let cancelled = false;
        loadAgencyTopics(agencyId)
            .then((loaded) => {
                if (cancelled) return;
                setTopics(loaded);
                // One topic: it is the only possible choice, the backend takes it anyway.
                if (loaded.length === 1) setTopicIds([loaded[0].id]);
            })
            .catch(() => !cancelled && setTopics([]));
        return () => {
            cancelled = true;
        };
    }, [agencyId, loadAgencyTopics]);

    const roleLabel = (value: SelfAssignmentRole) => t(...ROLE_LABEL_KEYS[value]);
    const needsTopics = role === 'COUNSELLOR' && (topics?.length ?? 0) > 1;
    const alreadyThere =
        agencyId != null &&
        (role === 'COUNSELLOR'
            ? assignments?.counsellorAgencyIds.includes(agencyId)
            : assignments?.agencyAdminAgencyIds.includes(agencyId));
    const canSubmit = agencyId != null && !submitting && !alreadyThere && (!needsTopics || topicIds.length > 0);

    const assignmentSummary = useMemo(() => {
        if (!assignments) return null;
        const parts: string[] = [];
        if (assignments.counsellorAgencyIds.length > 0) {
            parts.push(
                t('links.selfAssign.currentCounsellor', 'Berater:in in Nr. {{ids}}', {
                    ids: assignments.counsellorAgencyIds.join(', '),
                }),
            );
        }
        if (assignments.agencyAdminAgencyIds.length > 0) {
            parts.push(
                t('links.selfAssign.currentAgencyAdmin', 'BST-Admin in Nr. {{ids}}', {
                    ids: assignments.agencyAdminAgencyIds.join(', '),
                }),
            );
        }
        return parts.length > 0
            ? t('links.selfAssign.current', 'Sie sind bereits eingetragen als: {{list}}.', { list: parts.join(' · ') })
            : t('links.selfAssign.currentNone', 'Sie sind noch in keiner Beratungsstelle selbst eingetragen.');
    }, [assignments, t]);

    const explainFailure = async (failure: unknown): Promise<string> => {
        if (failure instanceof Response) {
            if (failure.status === 409) {
                const known = inviteConflictReasonKey(failure.headers.get(FETCH_ERRORS.X_REASON));
                if (known) return t(...known);
            }
            if (failure.status === 403) {
                return t(
                    'links.selfAssign.forbidden',
                    'In dieser Beratungsstelle dürfen Sie sich nicht in dieser Rolle eintragen.',
                );
            }
            const backend = await extractApiErrorMessageOrNull(failure);
            if (backend) return backend;
        }
        return t('links.selfAssign.failed', 'Eintragen hat nicht geklappt. Bitte erneut versuchen.');
    };

    const submit = async () => {
        if (!canSubmit || agencyId == null) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await assign({
                role,
                agencyId,
                topicIds: role === 'COUNSELLOR' && topicIds.length > 0 ? topicIds : undefined,
            });
            message.success(
                t('links.selfAssign.success', 'Sie sind jetzt als {{role}} in „{{agency}}“ eingetragen.', {
                    role: roleLabel(role),
                    agency: agency.unit?.name ?? `Nr. ${agencyId}`,
                }),
            );
            onAssigned?.(result);
            onClose();
        } catch (failure) {
            setError(await explainFailure(failure));
        } finally {
            setSubmitting(false);
        }
    };

    const hintId = 'self-assign-hint';

    return (
        <Modal
            title={t('links.selfAssign.title', 'Mich selbst eintragen')}
            description={t(
                'links.selfAssign.description',
                'Sie übernehmen mit Ihrem bestehenden Konto eine Rolle in einer Beratungsstelle — ohne Einladungs-E-Mail.',
            )}
            icon={<PersonAddAltOutlinedIcon />}
            okLabelKey="links.selfAssign.confirm"
            cancelLabelKey="links.selfAssign.cancel"
            confirmDisabled={!canSubmit}
            confirmDescribedBy={hintId}
            onConfirm={submit}
            onClose={onClose}
        >
            <div className={styles.body}>
                <FloatingLabelSelect<SelfAssignmentRole>
                    disabled={roles.length < 2}
                    label={t('links.composer.role', 'Rolle')}
                    options={roles.map((value) => ({ value, label: roleLabel(value) }))}
                    value={role}
                    onChange={(next) => {
                        setRole(next);
                        setError(null);
                    }}
                />
                <IdAllocationField
                    allocation={agency}
                    allowCreate={false}
                    label={t('links.composer.agency', 'Beratungsstelle')}
                    searchUnits={searchAgencies}
                />
                {needsTopics && topics && (
                    <FloatingLabelSelect<number[]>
                        label={t('links.selfAssign.topics', 'Themen, in denen Sie beraten')}
                        mode="multiple"
                        options={topics.map((topic) => ({ value: topic.id, label: topic.name }))}
                        value={topicIds}
                        onChange={(next) => setTopicIds(next)}
                    />
                )}
                <p className={styles.hint} id={hintId} role="status">
                    {(() => {
                        if (error) return error;
                        if (agencyId == null) {
                            return t('links.selfAssign.pickAgency', 'Bitte eine bestehende Beratungsstelle wählen.');
                        }
                        if (alreadyThere)
                            return t(...(inviteConflictReasonKey('SELF_ASSIGNMENT_ALREADY_EXISTS') ?? ['', '']));
                        if (needsTopics && topicIds.length === 0) {
                            return t(
                                'links.selfAssign.pickTopics',
                                'Diese Beratungsstelle hat mehrere Themen — bitte mindestens eines wählen.',
                            );
                        }
                        return assignmentSummary;
                    })()}
                </p>
                {(error || alreadyThere || agencyId == null || needsTopics) && assignmentSummary && (
                    <p className={styles.current}>{assignmentSummary}</p>
                )}
            </div>
        </Modal>
    );
};

export default SelfAssignDialog;
