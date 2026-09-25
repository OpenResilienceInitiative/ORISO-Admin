import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
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
import { explainInviteError } from './explainInviteError';
import { inviteConflictReasonKey, ROLE_LABEL_KEYS } from './inviteModel';
import styles from './selfAssignDialog.module.scss';

/** One topic (Fachbereich) of the chosen agency. */
export interface SelfAssignTopic {
    id: number;
    name: string;
}

export interface SelfAssignDialogProps {
    /** Preselected Beratungsstelle — the existing one chosen in the invite bar, if any. */
    initialAgency?: IdUnitOption;
    /** Type-ahead over the agencies the viewer may see (the invite bar's own search). */
    searchAgencies?: IdUnitSearch;
    /** Topics of an agency; a counsellor joining an agency with several topics must pick at least one. */
    loadAgencyTopics: (agencyId: number) => Promise<SelfAssignTopic[]>;
    /** Injectable for stories and tests; defaults to the real endpoints. */
    assign?: (request: SelfAssignmentRequest) => Promise<SelfAssignmentResult>;
    loadAssignments?: () => Promise<SelfAssignments>;
    agencyIdAllocation?: IdAllocationClient;
    onClose: () => void;
    onAssigned?: (result: SelfAssignmentResult) => void;
}

// The server takes only the counsellor role: an agency-admin row was never read.
const SELF_ASSIGN_ROLES: SelfAssignmentRole[] = ['COUNSELLOR'];

/** "Mich selbst eintragen": the admin joins a Beratungsstelle with their existing account, no e-mail invite. */
export const SelfAssignDialog = ({
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
    const roles = SELF_ASSIGN_ROLES;
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
        // A late answer after closing, or from an older loader, must not overwrite the current one.
        let cancelled = false;
        loadAssignments()
            .then((loaded) => !cancelled && setAssignments(loaded))
            .catch(() => !cancelled && setAssignments(null));
        return () => {
            cancelled = true;
        };
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
    const alreadyThere = agencyId != null && assignments?.counsellorAgencyIds.includes(agencyId);
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
            setError((await explainInviteError(failure, { t, action: 'selfAssign' })).message);
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
                {(error || alreadyThere || agencyId == null || (needsTopics && topicIds.length === 0)) &&
                    assignmentSummary && <p className={styles.current}>{assignmentSummary}</p>}
            </div>
        </Modal>
    );
};

export default SelfAssignDialog;
