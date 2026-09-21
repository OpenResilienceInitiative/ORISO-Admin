import { useMemo, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, message, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { extractApiErrorMessageOrNull } from '../../utils/extractApiErrorMessage';
import { ListingTable } from '../../components/ListingTable';
import { Modal, DialogButton } from '../../components/Modal';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import {
    assignBatchTenantIds,
    type InviteCsvRejectionReason,
    type InviteCsvTarget,
    type ParseInviteCsvResult,
} from './csv/parseInviteCsv';
import {
    DEFAULT_TOPIC_PERMISSION,
    inviteConflictReasonKey,
    ROLE_LABEL_KEYS,
    rolesForViewer,
    TOPIC_PERMISSION_LABEL_KEYS,
    type InviteRole,
    type InviteViewerScope,
    type TopicPermission,
} from './inviteModel';
import styles from './inviteCsvImport.module.scss';

/**
 * Payload per row — the tab wraps it into a full createAccountInvite request and
 * decides which id space `id` belongs to (see `InviteCsvIdKind`).
 */
export interface InviteCsvCreateRow {
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    /** Resolved ID column: the file's value, or the batch-assigned one on the Träger tab. */
    id?: number;
    /** #1026 "Ziel": EXISTING = invite into the unit with that id (agency space: UserService#1212). */
    target: InviteCsvTarget;
    /** #1026 "Rolle" (backend `targetRole`); an empty cell = the tab's role. */
    role: InviteRole;
    /** #1026 "Vorlage" resolved to a template of this tab; `undefined` = the one chosen in the bar. */
    templateId?: number;
    /** #1026 "Themen & Fachbereiche" (counsellors only); `undefined` = the agency default. */
    topicPermission?: TopicPermission;
    /** #1026 "Berät auch" (agency admins only); `undefined` = the backend default (yes). */
    alsoCounsellor?: boolean;
}

/** What the backend did with one row, as far as the preview shows it. */
export interface InviteCsvCreateOutcome {
    /** Stored, not sent: the row waits for its new Beratungsstelle / Träger (#1026 slice 5). */
    waiting?: boolean;
    /** Waiting, and no admin row for that unit has arrived (yet). */
    noUnitAdmin?: boolean;
}

/**
 * Which id space the CSV's 4th column addresses. `tenant` (Träger tab) resolves
 * empty cells client-side from the free-id sequence; `agency` leaves them empty
 * because AgencyService assigns the id when the invite is created (AUTO mode).
 */
export type InviteCsvIdKind = 'tenant' | 'agency';

type RowState = 'pending' | 'creating' | 'created' | 'failed';

interface ImportRow {
    /** Physical CSV line — unique per parse, used as the row key. */
    line: number;
    email: string;
    firstName: string;
    lastName: string;
    /** Explicit id from the file; frozen to the assigned id once created. */
    explicitId?: number;
    target?: InviteCsvTarget;
    role?: InviteRole;
    /** "Vorlage" as written in the file. */
    template?: string;
    topicPermission?: TopicPermission;
    alsoCounsellor?: boolean;
    rejectedReason?: InviteCsvRejectionReason;
    state: RowState;
    /** `created` flavour: stored and waiting for its unit (#1026 slice 5). */
    waiting?: boolean;
    noUnitAdmin?: boolean;
    /** `failed` flavour: the backend's 409 `X-Reason`, when it named one this preview explains. */
    conflictReason?: string;
    /** `failed` flavour: the backend rejected the id with 409. */
    conflict?: boolean;
    /**
     * P3 `failed` flavour: the 409 was about the recipient address already
     * belonging to a registered user, not about the id. Labelling that as an id
     * collision would send the admin to fix the wrong column.
     */
    emailTaken?: boolean;
    /**
     * `failed` flavour: the backend answered 403 — the admin's ROLE cannot create
     * these invites (UserService#1006). Every retry would fail the same way, so
     * the row must not look like a fixable data problem.
     */
    forbidden?: boolean;
}

export interface InviteCsvImportModalProps {
    parseResult: ParseInviteCsvResult;
    /** Which id space the 4th column addresses — drives the labels and the empty-cell handling. */
    idKind: InviteCsvIdKind;
    /** `tenant` kind: ids the auto-population must skip (existing tenants + active invites). */
    takenTenantIds?: Set<number>;
    /** #1026: the role this tab invites — the default for an empty "Rolle" cell. */
    tabRole?: InviteRole;
    /** #1026: who imports — limits the roles a row may hand out. */
    viewerScope?: InviteViewerScope;
    /** #1026: active templates of this tab, for the "Vorlage" column (by name or number). */
    templates?: InviteEmailTemplateDTO[];
    /** Creates ONE invite; rejections (e.g. a 409 `Response`) mark the row as failed. */
    createInvite: (row: InviteCsvCreateRow) => Promise<InviteCsvCreateOutcome | void>;
    /**
     * Roles this tab may import on top of the viewer rule. The Träger tab only
     * founds NEW Träger (Träger admins); other roles belong to the Berater tab.
     */
    tabRoles?: InviteRole[];
    /**
     * Whether a Träger-admin row can name its Träger here: the counsellor tab
     * invites into the viewer's OWN Träger, which a platform admin does not have.
     */
    ownTenantKnown?: boolean;
    /**
     * Role-aware explanation shown when a row fails with a 403 that carries no
     * usable backend message (UserService#1006). Provided by the tab, which
     * knows whether Träger admins or counsellors are being invited here.
     */
    forbiddenFallback: string;
    onClose: () => void;
    /** Called once per invite run that created at least one invite — refresh the invites table. */
    onCreated: () => void;
}

/**
 * CSV import preview (#315, Figma "Import CSV File"): every parsed row is
 * listed with a status chip, inline-editable name fields and a remove action;
 * rejected rows (invalid e-mail / id) stay visible with their line number but
 * are excluded from the import. Empty Träger-IDs are auto-populated with
 * consecutive free ids (continuing the composer's suggestion sequence and
 * skipping ids claimed earlier in the same batch); empty Beratungsstellen-IDs
 * stay empty because AgencyService allocates them on create. Confirming creates
 * the invites sequentially; per-row failures are marked in place — a 409 shows
 * up as "… vergeben" — and can be retried without re-uploading.
 */
export const InviteCsvImportModal = ({
    parseResult,
    idKind,
    takenTenantIds,
    tabRole = idKind === 'tenant' ? 'TENANT_ADMIN' : 'COUNSELLOR',
    viewerScope = 'platform',
    templates = [],
    createInvite,
    tabRoles,
    ownTenantKnown = true,
    forbiddenFallback,
    onClose,
    onCreated,
}: InviteCsvImportModalProps) => {
    const { t } = useTranslation();
    const [rows, setRows] = useState<ImportRow[]>(() =>
        [
            ...parseResult.rows.map<ImportRow>((row) => ({
                line: row.line,
                email: row.email,
                firstName: row.firstName,
                lastName: row.lastName,
                explicitId: row.id,
                target: row.target,
                role: row.role,
                template: row.template,
                topicPermission: row.topicPermission,
                alsoCounsellor: row.alsoCounsellor,
                state: 'pending',
            })),
            ...parseResult.rejected.map<ImportRow>((row) => ({
                line: row.line,
                email: row.email ?? (row.cells[0] ?? '').trim(),
                firstName: row.firstName ?? (row.cells[1] ?? '').trim(),
                lastName: row.lastName ?? (row.cells[2] ?? '').trim(),
                rejectedReason: row.reason,
                state: 'pending',
            })),
        ].sort((a, b) => a.line - b.line),
    );
    const [running, setRunning] = useState(false);

    const isTenantId = idKind === 'tenant';
    const idLabel = isTenantId
        ? t('links.accountInvites.tenantId', 'Träger-ID')
        : t('links.accountInvites.agencyId', 'Beratungsstellen-ID');
    const roleLabel = (role: InviteRole) => t(...ROLE_LABEL_KEYS[role]);
    const allowedRoles = rolesForViewer(viewerScope).filter((role) => tabRoles == null || tabRoles.includes(role));

    const findTemplate = (raw: string) => {
        const wanted = raw.trim().toLowerCase();
        return templates.find(
            (template) => template.name.trim().toLowerCase() === wanted || String(template.id) === wanted,
        );
    };

    /*
     * #1026 checks that need the tab's context (its role, its templates, what
     * the backend already accepts). A row with an issue stays visible with the
     * reason in plain German and is left out of the batch.
     */
    const rowIssue = (row: ImportRow): string | undefined => {
        const role = row.role ?? tabRole;
        const line = { line: row.line };
        if (!rolesForViewer(viewerScope).includes(role)) {
            return t(
                'links.csvImport.issue.roleNotAllowed',
                'Die Rolle „{{role}}“ dürfen Sie nicht vergeben (Zeile {{line}}).',
                {
                    role: roleLabel(role),
                    ...line,
                },
            );
        }
        if (!allowedRoles.includes(role)) {
            return t(
                'links.csvImport.issue.roleOtherTab',
                'Die Rolle „{{role}}“ wird im Tab „Berater-Invites“ eingeladen, nicht hier (Zeile {{line}}).',
                { role: roleLabel(role), ...line },
            );
        }
        if (row.topicPermission != null && role !== 'COUNSELLOR') {
            return t(
                'links.csvImport.issue.topicsOnlyCounsellor',
                '„Themen & Fachbereiche“ gilt nur für Berater:innen — bitte leer lassen (Zeile {{line}}).',
                line,
            );
        }
        if (row.alsoCounsellor != null && role !== 'AGENCY_ADMIN') {
            return t(
                'links.csvImport.issue.alsoCounsellorOnlyAgencyAdmin',
                '„Berät auch“ gilt nur für BST-Admins — bitte leer lassen (Zeile {{line}}).',
                line,
            );
        }
        if (!isTenantId && role === 'TENANT_ADMIN' && !ownTenantKnown) {
            return t(
                'links.csvImport.issue.tenantAdminNeedsTenantTab',
                'Träger-Admins laden Sie als Plattform-Admin im Tab „Träger-Invites“ ein (Ziel „bestehend“ mit der Träger-ID) (Zeile {{line}}).',
                line,
            );
        }
        // #1026 slice 5: a counsellor never founds a Beratungsstelle. A NEW one
        // needs its number, so the row can wait for the BST-Admin row with the
        // same number — "Neu" without a number could never be matched.
        if (!isTenantId && role === 'COUNSELLOR' && row.target !== 'EXISTING' && row.explicitId == null) {
            return t(
                'links.csvImport.issue.counsellorNeedsAgencyNumber',
                'Berater:innen für eine neue Beratungsstelle brauchen deren Nummer — dieselbe wie in der Zeile der BST-Admin (Zeile {{line}}).',
                line,
            );
        }
        if (row.template != null && findTemplate(row.template) == null) {
            return t(
                'links.csvImport.issue.unknownTemplate',
                'Die Vorlage „{{template}}“ gibt es hier nicht. Aktive Vorlagen: {{names}} (Zeile {{line}}).',
                {
                    template: row.template,
                    names: templates.map((template) => template.name).join(', ') || '—',
                    ...line,
                },
            );
        }
        return undefined;
    };

    const issueByLine = new Map(
        rows
            .filter((row) => !row.rejectedReason)
            .flatMap((row) => {
                const issue = rowIssue(row);
                return issue ? [[row.line, issue] as const] : [];
            }),
    );

    const importableRows = useMemo(
        () => rows.filter((row) => !row.rejectedReason && !issueByLine.has(row.line)),
        // issueByLine is derived from rows + the tab's stable context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rows, tabRole, viewerScope, templates, idKind],
    );

    // Effective id per line. Träger tab: the explicit file value, else the next free
    // id of the batch sequence — deleting a row re-packs the autos, created rows are
    // frozen via `explicitId`. Agency tab: only the explicit value; an empty cell
    // stays empty because AgencyService, not the browser, picks the free agency id.
    const idByLine = useMemo(() => {
        if (idKind === 'tenant') {
            return assignBatchTenantIds(
                importableRows.map((row) => ({ line: row.line, id: row.explicitId })),
                takenTenantIds ?? new Set<number>(),
            );
        }
        return new Map<number, number | undefined>(importableRows.map((row) => [row.line, row.explicitId]));
    }, [idKind, importableRows, takenTenantIds]);

    const pendingRows = importableRows.filter((row) => row.state === 'pending' || row.state === 'failed');

    const patchRow = (line: number, patch: Partial<ImportRow>) => {
        setRows((current) => current.map((row) => (row.line === line ? { ...row, ...patch } : row)));
    };

    const removeRow = (line: number) => {
        setRows((current) => current.filter((row) => row.line !== line));
    };

    const runImport = async () => {
        setRunning(true);
        const assigned = idByLine;
        let created = 0;
        let failed = 0;
        // A 403 fails EVERY row for the same role reason (UserService#1006) — remember
        // the first one so the admin gets the cause once, on top of the row states.
        let firstForbidden: Response | null = null;

        // Sequential on purpose: one POST per invite keeps failures attributable per
        // row, and the backend's id collision checks stay race-free.
        for (let i = 0; i < pendingRows.length; i += 1) {
            const row = pendingRows[i];
            const id = assigned.get(row.line);
            patchRow(row.line, {
                state: 'creating',
                conflict: false,
                emailTaken: false,
                forbidden: false,
                conflictReason: undefined,
            });
            try {
                const role = row.role ?? tabRole;
                const outcome: InviteCsvCreateOutcome =
                    // eslint-disable-next-line no-await-in-loop -- sequential on purpose (see above)
                    ((await createInvite({
                        recipientEmail: row.email,
                        firstName: row.firstName.trim() || undefined,
                        lastName: row.lastName.trim() || undefined,
                        id,
                        target: row.target ?? 'NEW',
                        role,
                        templateId: row.template != null ? findTemplate(row.template)?.id : undefined,
                        topicPermission:
                            role === 'COUNSELLOR' ? row.topicPermission ?? DEFAULT_TOPIC_PERMISSION : undefined,
                        alsoCounsellor: role === 'AGENCY_ADMIN' ? row.alsoCounsellor : undefined,
                    })) as InviteCsvCreateOutcome | undefined) ?? {};
                created += 1;
                patchRow(row.line, {
                    state: 'created',
                    explicitId: id,
                    waiting: outcome.waiting ?? false,
                    noUnitAdmin: outcome.noUnitAdmin ?? false,
                });
            } catch (error) {
                failed += 1;
                const conflict = error instanceof Response && error.status === 409;
                const forbidden = error instanceof Response && error.status === 403;
                if (forbidden && firstForbidden == null) {
                    firstForbidden = error as Response;
                }
                const reason = conflict ? (error as Response).headers.get(FETCH_ERRORS.X_REASON) : null;
                patchRow(row.line, {
                    state: 'failed',
                    conflict,
                    forbidden,
                    emailTaken: reason === X_REASON.EMAIL_NOT_AVAILABLE,
                    conflictReason: reason && inviteConflictReasonKey(reason) ? reason : undefined,
                });
                if (forbidden) {
                    // A role-level 403 applies to EVERY row — the remaining requests
                    // would all fail the same way, so mark them forbidden and stop
                    // instead of hammering the backend once per row.
                    const remaining = pendingRows.slice(i + 1);
                    failed += remaining.length;
                    remaining.forEach((skipped) =>
                        patchRow(skipped.line, {
                            state: 'failed',
                            conflict: false,
                            emailTaken: false,
                            forbidden: true,
                        }),
                    );
                    break;
                }
            }
        }

        setRunning(false);
        if (firstForbidden) {
            // Surface the role explanation once, distinct from the per-row states —
            // the backend's own message where it sends one (UserService#1006).
            message.error((await extractApiErrorMessageOrNull(firstForbidden)) ?? forbiddenFallback);
        }
        if (created > 0) {
            onCreated();
        }
        if (failed === 0 && created > 0) {
            message.success(t('links.csvImport.summaryAllCreated', '{{count}} Empfänger angelegt', { count: created }));
            onClose();
        } else if (failed > 0) {
            message.warning(
                t('links.csvImport.summaryPartial', '{{created}} Empfänger angelegt, {{failed}} fehlgeschlagen', {
                    created,
                    failed,
                }),
            );
        }
    };

    // Four mutually exclusive failure flavours — an if-chain instead of nested
    // ternaries, and `forbidden` first: a role rejection is not a fixable data
    // problem, so it must not be mislabelled as an id or address collision.
    const failedRowLabel = (row: ImportRow) => {
        if (row.forbidden) {
            return t('links.csvImport.status.forbidden', 'Nicht berechtigt');
        }
        if (row.emailTaken) {
            return t('links.csvImport.status.emailTaken', 'E-Mail-Adresse bereits vorhanden');
        }
        if (row.conflictReason === 'NO_PENDING_UNIT_ADMIN') {
            return t('links.csvImport.status.noPendingUnitAdmin', 'Keine BST-Admin für diese neue Beratungsstelle');
        }
        if (row.conflict) {
            return t('links.csvImport.status.idTaken', '{{idLabel}} vergeben', { idLabel });
        }
        return t('links.csvImport.status.failed', 'Fehlgeschlagen');
    };

    const rejectionText = (row: ImportRow): string | undefined => {
        const line = { line: row.line };
        switch (row.rejectedReason) {
            case 'invalidEmail':
                return t('links.csvImport.reason.invalidEmail', 'Ungültige E-Mail-Adresse (Zeile {{line}})', line);
            case 'invalidId':
                return t('links.csvImport.reason.invalidId', 'Ungültige {{idLabel}} (Zeile {{line}})', {
                    idLabel,
                    ...line,
                });
            case 'invalidMode':
                return t(
                    'links.csvImport.reason.invalidMode',
                    'Unbekanntes Ziel — erlaubt sind „neu“ oder „bestehend“ (Zeile {{line}})',
                    line,
                );
            case 'existingWithoutId':
                return t(
                    'links.csvImport.reason.existingWithoutId',
                    '„bestehend“ braucht eine {{idLabel}} (Zeile {{line}})',
                    { idLabel, ...line },
                );
            case 'invalidRole':
                return t(
                    'links.csvImport.reason.invalidRole',
                    'Unbekannte Rolle — erlaubt sind Berater:in, BST-Admin oder Träger-Admin (Zeile {{line}})',
                    line,
                );
            case 'invalidAlsoCounsellor':
                return t(
                    'links.csvImport.reason.invalidAlsoCounsellor',
                    'Unbekannter Wert bei „Berät auch“ — erlaubt sind ja, nein, true oder false (Zeile {{line}})',
                    line,
                );
            case 'invalidTopicPermission':
                return t(
                    'links.csvImport.reason.invalidTopicPermission',
                    'Unbekannter Wert bei „Themen & Fachbereiche“ — erlaubt sind NONE, SELECT_EXISTING, CREATE, true oder false (Zeile {{line}})',
                    line,
                );
            default:
                return issueByLine.get(row.line);
        }
    };

    const statusTag = (row: ImportRow) => {
        const reason = rejectionText(row);
        if (reason) {
            // The reason is spelled out under the chip, not only in a tooltip:
            // the admin has to fix the FILE and needs to read what is wrong.
            return (
                <span className={styles.rejection}>
                    <Tag color="red">{t('links.csvImport.status.rejected', 'Abgelehnt')}</Tag>
                    <span className={styles.rejectionReason}>{reason}</span>
                </span>
            );
        }
        switch (row.state) {
            case 'creating':
                return <Tag color="gold">{t('links.csvImport.status.creating', 'Wird angelegt …')}</Tag>;
            case 'created':
                if (row.waiting) {
                    // #1026 slice 5: stored, not sent — explained in place, like a rejection.
                    return (
                        <span className={styles.rejection}>
                            <Tag color={row.noUnitAdmin ? 'red' : 'blue'}>
                                {t('links.csvImport.status.waiting', 'Vorgemerkt')}
                            </Tag>
                            <span className={styles.rejectionReason}>
                                {row.noUnitAdmin
                                    ? t(
                                          'links.csvImport.status.waitingNoAdmin',
                                          'Kein BST-Admin: Für diese neue Beratungsstelle fehlt noch die Zeile der BST-Admin.',
                                      )
                                    : t(
                                          'links.csvImport.status.waitingHint',
                                          'Geht raus, sobald die Beratungsstelle angelegt ist.',
                                      )}
                            </span>
                        </span>
                    );
                }
                return <Tag color="green">{t('links.csvImport.status.created', 'Angelegt')}</Tag>;
            case 'failed':
                return <Tag color="red">{failedRowLabel(row)}</Tag>;
            default:
                return <Tag color="green">{t('links.csvImport.status.valid', 'Gültig')}</Tag>;
        }
    };

    const nameCell = (row: ImportRow, field: 'firstName' | 'lastName', label: string) => {
        if (row.rejectedReason || row.state === 'created' || row.state === 'creating') {
            return row[field] || '—';
        }
        return (
            <Input
                aria-label={`${label} (${row.email})`}
                className={styles.nameInput}
                size="small"
                value={row[field]}
                onChange={(event) => patchRow(row.line, { [field]: event.target.value })}
            />
        );
    };

    const columns = [
        {
            title: t('links.csvImport.col.status', 'Status'),
            key: 'status',
            width: 200,
            render: (_: unknown, row: ImportRow) => statusTag(row),
        },
        {
            title: t('links.accountInvites.email', 'E-Mail'),
            dataIndex: 'email',
            key: 'email',
            width: 200,
        },
        {
            title: t('links.accountInvites.firstName', 'Vorname'),
            key: 'firstName',
            width: 120,
            render: (_: unknown, row: ImportRow) =>
                nameCell(row, 'firstName', t('links.accountInvites.firstName', 'Vorname')),
        },
        {
            title: t('links.composer.lastName', 'Name'),
            key: 'lastName',
            width: 120,
            render: (_: unknown, row: ImportRow) => nameCell(row, 'lastName', t('links.composer.lastName', 'Name')),
        },
        {
            title: idLabel,
            key: 'id',
            width: 110,
            render: (_: unknown, row: ImportRow) => {
                if (row.rejectedReason) return '—';
                const id = idByLine.get(row.line);
                if (id == null) {
                    // Agency tab: the free id is picked by AgencyService when the invite is
                    // created, so there is no number to show yet — naming the mechanism beats
                    // inventing an id the browser cannot reserve.
                    return isTenantId ? (
                        '—'
                    ) : (
                        <Tooltip title={t('links.csvImport.autoOnCreate', 'Wird beim Anlegen automatisch vergeben')}>
                            <span className={styles.autoId}>{t('links.csvImport.auto', 'Automatisch')}</span>
                        </Tooltip>
                    );
                }
                return row.explicitId != null ? (
                    id
                ) : (
                    <Tooltip title={t('links.csvImport.autoAssigned', 'Automatisch vergeben')}>
                        <span className={styles.autoId}>{id}</span>
                    </Tooltip>
                );
            },
        },
        {
            title: t('links.csvImport.col.target', 'Ziel'),
            key: 'target',
            width: 90,
            render: (_: unknown, row: ImportRow) => {
                if (row.rejectedReason) return '—';
                return row.target === 'EXISTING'
                    ? t('links.csvImport.target.existing', 'Bestehend')
                    : t('links.csvImport.target.new', 'Neu');
            },
        },
        {
            title: t('links.composer.role', 'Rolle'),
            key: 'role',
            width: 110,
            render: (_: unknown, row: ImportRow) => (row.rejectedReason ? '—' : roleLabel(row.role ?? tabRole)),
        },
        {
            title: t('links.composer.template', 'Vorlage'),
            key: 'template',
            width: 160,
            render: (_: unknown, row: ImportRow) => {
                if (row.rejectedReason) return '—';
                if (row.template == null) {
                    return (
                        <span className={styles.autoId}>
                            {t('links.csvImport.templateFromBar', 'wie in der Leiste')}
                        </span>
                    );
                }
                return findTemplate(row.template)?.name ?? row.template;
            },
        },
        {
            title: t('links.composer.topics', 'Themen & Fachbereiche'),
            key: 'topicPermission',
            width: 180,
            render: (_: unknown, row: ImportRow) => {
                if (row.rejectedReason || (row.role ?? tabRole) !== 'COUNSELLOR') return '—';
                const value = row.topicPermission ?? DEFAULT_TOPIC_PERMISSION;
                return (
                    <Tooltip title={t(...TOPIC_PERMISSION_LABEL_KEYS[value].description)}>
                        <span>{t(...TOPIC_PERMISSION_LABEL_KEYS[value].title)}</span>
                    </Tooltip>
                );
            },
        },
        {
            title: t('links.composer.alsoCounsellor.label', 'Berät auch'),
            key: 'alsoCounsellor',
            width: 110,
            render: (_: unknown, row: ImportRow) => {
                if (row.rejectedReason || (row.role ?? tabRole) !== 'AGENCY_ADMIN') return '—';
                return row.alsoCounsellor === false
                    ? t('links.composer.alsoCounsellor.no', 'Nur Verwaltung')
                    : t('links.composer.alsoCounsellor.yes', 'Berät auch');
            },
        },
        {
            title: '',
            key: 'remove',
            width: 48,
            render: (_: unknown, row: ImportRow) =>
                row.state === 'created' || row.state === 'creating' ? null : (
                    <Button
                        aria-label={`${t('links.csvImport.removeRow', 'Zeile entfernen')} (${row.email || row.line})`}
                        disabled={running}
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        onClick={() => removeRow(row.line)}
                    />
                ),
        },
    ];

    return (
        <Modal
            titleKey="links.csvImport.title"
            icon={<UploadFileOutlinedIcon />}
            // Eight data columns since #1026: wide enough to show them all on a laptop.
            width={1440}
            footer={
                <div className={styles.footer}>
                    <DialogButton disabled={running} onClick={onClose}>
                        {t('links.csvImport.cancel', 'Abbrechen')}
                    </DialogButton>
                    <DialogButton
                        primary
                        disabled={running || pendingRows.length === 0}
                        loading={running}
                        onClick={runImport}
                    >
                        {t('links.csvImport.confirm', '{{count}} Empfänger anlegen', { count: pendingRows.length })}
                    </DialogButton>
                </div>
            }
            onClose={onClose}
        >
            <p className={styles.columnsHint}>
                {isTenantId
                    ? t(
                          'links.csvImport.columnsHintV3',
                          'Spalten: E-Mail, Vorname, Name, Träger-ID, Ziel (neu/bestehend), Rolle, Vorlage — nur E-Mail ist Pflicht. „bestehend“ lädt eine weitere Träger-Admin in den Träger mit dieser Nummer ein; leere Träger-IDs werden für neue Träger automatisch vergeben; eine leere Vorlage nimmt die aus der Leiste.',
                      )
                    : t(
                          'links.csvImport.columnsHintAgencyV3',
                          'Spalten: E-Mail, Vorname, Name, Beratungsstellen-ID, Ziel (neu/bestehend), Rolle, Vorlage, Themen & Fachbereiche (NONE/SELECT_EXISTING/CREATE oder true/false), Berät auch (ja/nein) — nur E-Mail ist Pflicht. „bestehend“ lädt in die Beratungsstelle mit dieser Nummer ein. Eine neue Beratungsstelle legt ihre BST-Admin-Zeile an; Berater:innen-Zeilen mit derselben Nummer warten darauf — die Reihenfolge der Zeilen ist egal.',
                      )}
            </p>
            <ListingTable<ImportRow>
                columns={columns}
                dataSource={rows}
                pagination={false}
                rowKey="line"
                scroll={{ y: 'auto' }}
            />
        </Modal>
    );
};

export default InviteCsvImportModal;
