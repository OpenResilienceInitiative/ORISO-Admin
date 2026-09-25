import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import classNames from 'classnames';
import type {
    AccountInviteDTO,
    AccountInviteStatus,
    AccountInviteTargetRole,
} from '../../../api/accountInvites/accountInvites';
import { ReactComponent as EmptyStateIcon } from '../../../resources/img/svg/oriso/empty_state_96px.svg';
import {
    DataTable,
    DataTableCell,
    DataTableHeader,
    DataTablePagination,
    DataTableRow,
    DataTableSort,
    DataTableToolbar,
    PhaseStepper,
    StatTile,
} from '../../../components/DataTable';
import { FilterChip } from '../../../components/FilterChip';
import { IconButton } from '../../../components/IconButton';
import { M3Tooltip } from '../../../components/M3Tooltip';
import { M3Button } from '../../../components/M3Button';
import { M3Checkbox } from '../../../components/M3Checkbox';
import {
    TOPIC_PERMISSION_LABEL_KEYS,
    TOPIC_PERMISSION_SHORT_LABEL_KEYS,
    TOPIC_PERMISSIONS,
    type TopicPermission,
} from '../inviteModel';
import {
    countInviteBuckets,
    deriveInviteBucket,
    derivePhases,
    isDraftInvite,
    formatRelativeTime,
    hasQueueProblem,
    INVITE_BUCKETS,
    InviteBucket,
    inviteDisplayName,
    inviteLastActivity,
    isDeadInvite,
    isWaitingForUnit,
    matchesInviteQuery,
    PHASE_AWAITING_FALLBACKS,
    PHASE_LABEL_FALLBACKS,
    phaseAwaitingLabelKey,
    phaseLabelKey,
} from './derivePhases';
import styles from './inviteProgressBoard.module.scss';

/**
 * Send-state chip wording (#316): German product labels; the fallbacks double
 * as the i18n defaults for both locale files.
 */
export const INVITE_STATUS_FALLBACK_LABELS: Record<AccountInviteStatus, string> = {
    WAITING_FOR_UNIT: 'Wartet',
    DRAFT: 'Draft',
    EMAIL_SENT: 'Gesendet',
    ACCEPTED: 'Angenommen',
    EXPIRED: 'Abgelaufen',
    REVOKED: 'Widerrufen',
    SUPERSEDED: 'Ersetzt',
};

/**
 * What each status MEANS (C3). The owner asked for this globally, not only for
 * „Ersetzt": the labels are domain vocabulary, and a one-word chip cannot say
 * whether a link still works or why a row went dead. Shown in both places the
 * vocabulary appears — the filter chip and the row badge — and, like the labels
 * themselves, the fallbacks double as the German i18n defaults.
 */
export const INVITE_STATUS_FALLBACK_HINTS: Record<AccountInviteStatus, string> = {
    WAITING_FOR_UNIT:
        'Vorgemerkt, aber noch nicht versendet: die Beratungsstelle bzw. der Träger ist noch nicht angelegt. Die E-Mail geht automatisch raus, sobald die Admin-Person ihr Onboarding abgeschlossen hat.',
    DRAFT: 'Angelegt, aber noch nicht versendet — es ist keine E-Mail herausgegangen.',
    EMAIL_SENT: 'Die Einladungs-E-Mail wurde versendet und wartet darauf, angenommen zu werden.',
    ACCEPTED: 'Die Einladung wurde angenommen — das Konto besteht, der Link ist verbraucht.',
    EXPIRED: 'Die Gültigkeit der Einladung ist abgelaufen — der Link funktioniert nicht mehr.',
    REVOKED: 'Die Einladung wurde zurückgezogen — der Link ist ungültig.',
    SUPERSEDED: 'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
};

const STATUS_FILTER_ORDER: AccountInviteStatus[] = [
    'WAITING_FOR_UNIT',
    'DRAFT',
    'EMAIL_SENT',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED',
    'SUPERSEDED',
];

const BUCKET_FALLBACK_LABELS: Record<InviteBucket, string> = {
    invited: 'Eingeladen',
    inProgress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
    problem: 'Abgelaufen / Problem',
};

/** One active filter at a time: a summary tile (bucket) or a status chip. */
type InviteFilter = { kind: 'bucket'; bucket: InviteBucket } | { kind: 'status'; status: AccountInviteStatus };

/** The single predicate behind both the rendered rows and the selection pruning. */
const matchesFilter = (invite: AccountInviteDTO, filter: InviteFilter | null) => {
    if (!filter) return true;
    if (filter.kind === 'status') return invite.inviteStatus === filter.status;
    return deriveInviteBucket(invite) === filter.bucket;
};

/** An invite still able to change can be resent/revoked (terminal states cannot). */
const isActionable = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT';

/** A waiting invite has no link yet: it can be revoked, not sent or copied. */
const isRevocable = (invite: AccountInviteDTO) => isActionable(invite) || isWaitingForUnit(invite);

/** The topic permission only exists for counsellors, and stays editable after the account exists. */
type Translate = (key: string, fallback: string) => string;

/** Badge and tooltip of a queue problem, naming the unit the invite waits for. */
const queueProblemCopy = (invite: Pick<AccountInviteDTO, 'waitingForUnit'>, t: Translate) =>
    invite.waitingForUnit === 'TENANT'
        ? {
              badge: t('links.inviteProgress.queueProblemTenant', 'Kein Träger-Admin'),
              hint: t(
                  'links.inviteProgress.queueProblemTenantHint',
                  'Für diesen neuen Träger ist keine Träger-Admin-Einladung mehr offen (abgelaufen oder widerrufen). Laden Sie eine Träger-Admin mit derselben Nummer ein — dann rückt diese Einladung automatisch nach.',
              ),
          }
        : {
              badge: t('links.inviteProgress.queueProblem', 'Kein BST-Admin'),
              hint: t(
                  'links.inviteProgress.queueProblemHint',
                  'Für diese neue Beratungsstelle ist keine BST-Admin-Einladung mehr offen (abgelaufen oder widerrufen). Laden Sie eine BST-Admin mit derselben Nummer ein — dann rückt diese Einladung automatisch nach.',
              ),
          };

const hasEditableTopicPermission = (invite: AccountInviteDTO) =>
    invite.targetRole === 'COUNSELLOR' && !isDeadInvite(invite);

/** Sent without a delivery receipt — the badge and its hint must both say so. */
const isDeliveryUnconfirmed = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'EMAIL_SENT' && invite.emailDeliveryStatus !== 'SENT';

const inviteStatusHint = (invite: AccountInviteDTO) => {
    if (isDeliveryUnconfirmed(invite)) {
        return {
            key: 'links.accountInvites.statusHint.deliveryUnconfirmed',
            fallback:
                'Der Versand konnte nicht bestätigt werden. Die Einladung bleibt erhalten und kann erneut gesendet werden.',
        };
    }
    return {
        key: `links.accountInvites.statusHint.${invite.inviteStatus}`,
        fallback: INVITE_STATUS_FALLBACK_HINTS[invite.inviteStatus],
    };
};

export interface InviteProgressBoardProps {
    invites: AccountInviteDTO[];
    loading: boolean;
    /** Toolbar search query (A4/#376); blank shows everything. */
    searchQuery?: string;
    /** The tab's audience — decides the phase track and the Träger-ID hint. */
    targetRole: AccountInviteTargetRole;
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
    /** Which rows offer a bulk checkbox (the checkbox stays visible but disabled otherwise). */
    isRowSelectable: (invite: AccountInviteDTO) => boolean;
    /** Disables selection while a bulk run is in flight. */
    selectionDisabled?: boolean;
    onResend: (invite: AccountInviteDTO) => void;
    onCopyLink: (invite: AccountInviteDTO) => void;
    onRevoke: (invite: AccountInviteDTO) => void;
    /** Wired to the invite composer above the board (empty-state CTA). */
    onInviteCta?: () => void;
    /** Changes a counsellor's topic permission, also after the account exists; without it the chip is disabled. */
    onTopicPermissionChange?: (invite: AccountInviteDTO, topicPermission: TopicPermission) => void;
    /** Invite ids whose topic permission is being saved right now (the chip is disabled meanwhile). */
    topicPermissionSavingIds?: number[];
}

/** Per-row topic permission as a chip in the role chip's line; picking a level saves at once. */
const TopicPermissionChip = ({
    value,
    displayName,
    disabled,
    disabledReason,
    onChange,
}: {
    value: TopicPermission;
    displayName: string;
    disabled: boolean;
    /** Tooltip text while disabled; the level's title and description otherwise. */
    disabledReason?: string;
    onChange: (next: TopicPermission) => void;
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const title = (option: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[option].title);
    const description = (option: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[option].description);
    const short = t(...TOPIC_PERMISSION_SHORT_LABEL_KEYS[value]);
    const label = t('links.inviteProgress.topicsChip', 'Themen: {{value}}', { value: short });

    const items: MenuProps['items'] = TOPIC_PERMISSIONS.map((option) => ({
        key: option,
        label: (
            <span className={styles.topicOption}>
                <span className={styles.topicOptionCheck} aria-hidden>
                    {option === value && <CheckIcon fontSize="inherit" />}
                </span>
                <span className={styles.topicOptionText}>
                    <span className={styles.topicOptionTitle}>{title(option)}</span>
                    <span className={styles.topicOptionDescription}>{description(option)}</span>
                </span>
            </span>
        ),
    }));

    const chip = (
        <button
            type="button"
            className={classNames(styles.topicChip, { [styles.topicChipOpen]: open })}
            // aria-disabled instead of disabled: a disabled button swallows the
            // hover and focus the tooltip needs to explain why it is locked.
            aria-disabled={disabled || undefined}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${t('links.inviteProgress.topicsFor', 'Themen für {{name}}', {
                name: displayName,
            })}: ${short}`}
        >
            <span>{label}</span>
            <ArrowDropDownIcon className={styles.topicChipIcon} aria-hidden />
        </button>
    );

    // Dropdown and M3Tooltip both clone their child: the Dropdown gets a span, the tooltip the button.
    return (
        <Dropdown
            open={open && !disabled}
            onOpenChange={(next) => setOpen(disabled ? false : next)}
            trigger={['click']}
            placement="bottomLeft"
            // On a phone the chip sits mid-row: shift the menu back into the
            // viewport instead of letting its right edge run off-screen.
            align={{ overflow: { adjustX: 1, adjustY: 1, shiftX: true } }}
            overlayClassName={styles.topicMenu}
            menu={{
                items,
                selectedKeys: [value],
                onClick: ({ key }) => {
                    setOpen(false);
                    if (key !== value) onChange(key as TopicPermission);
                },
            }}
        >
            <span className={styles.topicChipAnchor}>
                <M3Tooltip
                    portal
                    text={disabled && disabledReason ? disabledReason : `${title(value)} – ${description(value)}`}
                >
                    {chip}
                </M3Tooltip>
            </span>
        </Dropdown>
    );
};

/**
 * The "Onboarding" tracking board (Links page): summary tiles that filter,
 * status chips, the phase-progress table (one row per invitee) and client-side
 * pagination. Rendering only — data and actions stay in `AccountInvitesTab`.
 */
export const InviteProgressBoard = ({
    invites,
    loading,
    searchQuery = '',
    targetRole,
    selectedIds,
    onSelectionChange,
    isRowSelectable,
    selectionDisabled = false,
    onResend,
    onCopyLink,
    onRevoke,
    onInviteCta,
    onTopicPermissionChange,
    topicPermissionSavingIds = [],
}: InviteProgressBoardProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language || 'de';
    const [filter, setFilter] = useState<InviteFilter | null>(null);
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // A changed filter always restarts at page 1 — page 3 of a filter that only
    // has one page would otherwise show the empty slot with rows available.
    useEffect(() => {
        setPage(1);
    }, [filter, searchQuery]);

    // The tiles count the WHOLE list, not the search result: they are the
    // overview the search is run against, and a "3 Abgeschlossen" that silently
    // meant "3 among the rows matching fisch" would be a different number every
    // keystroke.
    const bucketCounts = useMemo(() => countInviteBuckets(invites), [invites]);

    const searched = useMemo(
        () => (searchQuery.trim() ? invites.filter((invite) => matchesInviteQuery(invite, searchQuery)) : invites),
        [invites, searchQuery],
    );

    const filtered = useMemo(() => {
        if (!filter) return searched;
        if (filter.kind === 'status') return searched.filter((invite) => invite.inviteStatus === filter.status);
        return searched.filter((invite) => deriveInviteBucket(invite) === filter.bucket);
    }, [searched, filter]);

    /**
     * Switching a tile or a chip also prunes the selection down to the rows the
     * new filter still shows. The bulk actions above the board act on the
     * selection, NOT on what is on screen — a row hidden by a filter would
     * otherwise stay silently checked and get resent or revoked without the
     * admin ever seeing it. Complementary to the `searched`-based effect below,
     * which covers the search-query dimension.
     */
    const applyFilter = (next: InviteFilter | null) => {
        setFilter(next);
        if (selectedIds.length === 0) return;
        const stillVisible = selectedIds.filter((id) =>
            invites.some((invite) => invite.id === id && matchesFilter(invite, next)),
        );
        if (stillVisible.length !== selectedIds.length) {
            onSelectionChange(stillVisible);
        }
    };

    // A4×B: a row hidden by the SEARCH query must not stay selected in the
    // background — left alone, a destructive bulk action (revoke) could reach
    // a row the operator can no longer see. Scoped to `searched` deliberately,
    // not the further status/bucket-filtered `filtered` below: pruning on a
    // tile/chip filter change is open PR #766 ("guard stale invite loads and
    // prune selection on filter change") — this only covers the dimension that
    // PR does not (it predates the search feature). The two effects are
    // independent and, once #766 lands, complementary rather than redundant.
    // Pagination is deliberately excluded: moving to page 2 must not silently
    // drop a selection that spans more than one page.
    useEffect(() => {
        const visibleIds = new Set(searched.map((invite) => invite.id));
        const pruned = selectedIds.filter((id) => visibleIds.has(id));
        if (pruned.length !== selectedIds.length) {
            onSelectionChange(pruned);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the SEARCH RESULT changing, not to the selection itself (that would set-state loop)
    }, [searched]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const factor = sort.direction === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            if (sort.key === 'invitedAt') {
                return factor * (new Date(a.createDate).getTime() - new Date(b.createDate).getTime());
            }
            // Ordered by the string the cell renders, not by the e-mail behind it.
            return factor * inviteDisplayName(a).localeCompare(inviteDisplayName(b), locale);
        });
    }, [filtered, sort, locale]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const effectivePage = Math.min(page, pageCount);
    const pageRows = sorted.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

    // The clamp above only fixes what is rendered. Writing it back keeps the
    // state honest: a shrinking list (revoke + refetch) that grows again would
    // otherwise snap back to the old, higher page without the admin touching
    // the pager.
    useEffect(() => {
        if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    // A chip beside the role chip: a column pushed the actions out of 1440px, a select made rows taller.
    const showTopicPermission = targetRole !== 'TENANT_ADMIN';
    const topicPermissionLockedReason = t(
        'links.inviteProgress.topicsLocked',
        'Sie haben keine Berechtigung, die Themen-Berechtigung dieser Person zu ändern.',
    );

    const columns = useMemo(
        () => [
            { key: 'select', ariaLabel: t('links.inviteProgress.col.select', 'Auswahl'), width: 48 },
            { key: 'recipient', label: t('links.inviteProgress.col.recipient', 'Empfänger'), sortable: true },
            { key: 'progress', label: t('links.inviteProgress.col.progress', 'Onboarding-Fortschritt') },
            { key: 'invitedAt', label: t('links.inviteProgress.col.invitedAt', 'Eingeladen am'), sortable: true },
            { key: 'lastActivity', label: t('links.inviteProgress.col.lastActivity', 'Letzte Aktivität') },
            { key: 'status', label: t('links.inviteProgress.col.status', 'Status') },
            {
                key: 'actions',
                label: t('links.inviteProgress.col.actions', 'Aktionen'),
                align: 'right' as const,
            },
        ],
        [t],
    );

    const toggleSelection = (invite: AccountInviteDTO, next: boolean) => {
        onSelectionChange(next ? [...selectedIds, invite.id] : selectedIds.filter((id) => id !== invite.id));
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

    const emptyUnfiltered = invites.length === 0;

    return (
        // The section is deliberately unnamed: naming it with the same string as
        // the tile group below announced "Onboarding-Übersicht" twice in a row.
        // The tile group and the table each carry their own name.
        <section className={styles.board}>
            <div
                className={styles.summary}
                role="group"
                aria-label={t('links.inviteProgress.summaryLabel', 'Onboarding-Übersicht')}
            >
                {INVITE_BUCKETS.map((bucket) => (
                    <StatTile
                        key={bucket}
                        className={styles.summaryTile}
                        label={t(`links.inviteProgress.summary.${bucket}`, BUCKET_FALLBACK_LABELS[bucket])}
                        value={bucketCounts[bucket]}
                        tone={bucket === 'problem' ? 'error' : 'default'}
                        active={filter?.kind === 'bucket' && filter.bucket === bucket}
                        onClick={() =>
                            applyFilter(
                                filter?.kind === 'bucket' && filter.bucket === bucket
                                    ? null
                                    : { kind: 'bucket', bucket },
                            )
                        }
                    />
                ))}
            </div>

            <DataTableToolbar
                filters={STATUS_FILTER_ORDER.map((status) => (
                    <FilterChip
                        key={status}
                        label={t(`links.accountInvites.status.${status}`, INVITE_STATUS_FALLBACK_LABELS[status])}
                        tooltip={t(`links.accountInvites.statusHint.${status}`, INVITE_STATUS_FALLBACK_HINTS[status])}
                        selected={filter?.kind === 'status' && filter.status === status}
                        onChange={(next) => applyFilter(next ? { kind: 'status', status } : null)}
                    />
                ))}
            />

            <DataTable
                ariaLabel={t('links.inviteProgress.tableLabel', 'Einladungen und Onboarding-Fortschritt')}
                stickyHeader
                stackedOnMobile
                loading={loading}
                skeletonColumns={columns.length}
                isEmpty={sorted.length === 0}
                empty={
                    <div className={styles.empty}>
                        <EmptyStateIcon aria-hidden className={styles.emptyGraphic} />
                        {emptyUnfiltered ? (
                            <>
                                <p className={styles.emptyTitle}>
                                    {t('links.inviteProgress.empty.title', 'Noch keine Einladungen')}
                                </p>
                                <p className={styles.emptyBody}>
                                    {t(
                                        'links.inviteProgress.empty.body',
                                        'Sobald Sie jemanden einladen, sehen Sie hier den Onboarding-Fortschritt.',
                                    )}
                                </p>
                                {onInviteCta && (
                                    <M3Button variant="tonal" onClick={onInviteCta}>
                                        {t('links.inviteProgress.empty.cta', 'Erste Einladung senden')}
                                    </M3Button>
                                )}
                            </>
                        ) : (
                            <p className={styles.emptyBody}>
                                {t('links.inviteProgress.empty.filtered', 'Keine Einladungen für diesen Filter.')}
                            </p>
                        )}
                    </div>
                }
                header={<DataTableHeader columns={columns} sort={sort} onSortChange={setSort} />}
                footer={
                    <DataTablePagination
                        page={effectivePage}
                        pageSize={pageSize}
                        total={sorted.length}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                    />
                }
            >
                {pageRows.map((invite) => {
                    const dead = isDeadInvite(invite);
                    const actionable = isActionable(invite);
                    // Same helper the "Empfänger" comparator uses, so the column
                    // is ordered by exactly what this cell shows.
                    const displayName = inviteDisplayName(invite);
                    const hasName = displayName !== invite.recipientEmail;
                    const lastActivity = inviteLastActivity(invite);
                    const statusChipClass = classNames(styles.statusChip, { [styles.statusChipDead]: dead });
                    // A waiting invite without a unit admin was never mailed: its
                    // warning bead is the queue problem, not a delivery problem.
                    const queueProblem = hasQueueProblem(invite);
                    const phases = derivePhases(invite).map((phase) => ({
                        key: phase.key,
                        state: phase.state,
                        ...(queueProblem && phase.state === 'warning'
                            ? {
                                  stateLabel:
                                      invite.waitingForUnit === 'TENANT'
                                          ? t(
                                                'links.inviteProgress.queueProblemTenantState',
                                                'Kein Träger-Admin – Einladung wartet',
                                            )
                                          : t(
                                                'links.inviteProgress.queueProblemState',
                                                'Kein BST-Admin – Einladung wartet',
                                            ),
                                  stateHint: t(
                                      'links.inviteProgress.queueProblemStateHint',
                                      'für diese neue Einheit ist keine Admin-Einladung mehr offen; die Einladung wartet.',
                                  ),
                              }
                            : {}),
                        // A CURRENT phase is awaited, not reached: its label says
                        // what the row waits FOR ("Wartet auf Registrierung")
                        // instead of printing the reached-state word.
                        label:
                            phase.state === 'current' || (phase.state === 'warning' && isWaitingForUnit(invite))
                                ? t(phaseAwaitingLabelKey(phase.key), PHASE_AWAITING_FALLBACKS[phase.key])
                                : t(phaseLabelKey(phase.key), PHASE_LABEL_FALLBACKS[phase.key]),
                    }));

                    return (
                        <DataTableRow
                            key={invite.id}
                            tone={dead ? 'error' : 'default'}
                            selected={selectedIds.includes(invite.id)}
                            className={styles.row}
                        >
                            <DataTableCell align="center" className={styles.selectCell}>
                                <M3Checkbox
                                    checked={selectedIds.includes(invite.id)}
                                    disabled={!isRowSelectable(invite) || selectionDisabled}
                                    label={t('links.inviteProgress.selectRow', 'Einladung für {{email}} auswählen', {
                                        email: invite.recipientEmail,
                                    })}
                                    onChange={(next) => toggleSelection(invite, next)}
                                />
                            </DataTableCell>
                            <DataTableCell className={styles.identityCell}>
                                <div className={styles.identity}>
                                    <span className={styles.identityName}>{displayName}</span>
                                    {hasName && <span className={styles.identityEmail}>{invite.recipientEmail}</span>}
                                    <span className={styles.identityMeta}>
                                        <span className={styles.roleChip}>
                                            {t(`links.inviteProgress.role.${invite.targetRole}`, invite.targetRole)}
                                        </span>
                                        {targetRole === 'TENANT_ADMIN' && invite.tenantId != null && (
                                            <span className={styles.idHint}>
                                                {t('links.inviteProgress.tenantIdShort', 'Träger-ID {{id}}', {
                                                    id: invite.tenantId,
                                                })}
                                            </span>
                                        )}
                                        {showTopicPermission && hasEditableTopicPermission(invite) && (
                                            <TopicPermissionChip
                                                disabled={
                                                    !onTopicPermissionChange ||
                                                    topicPermissionSavingIds.includes(invite.id)
                                                }
                                                disabledReason={
                                                    onTopicPermissionChange ? undefined : topicPermissionLockedReason
                                                }
                                                displayName={displayName}
                                                // Older invites carry no value: they behave as CREATE.
                                                value={invite.topicPermission ?? 'CREATE'}
                                                onChange={(next) => onTopicPermissionChange?.(invite, next)}
                                            />
                                        )}
                                    </span>
                                </div>
                            </DataTableCell>
                            <DataTableCell className={styles.progressCell}>
                                <PhaseStepper
                                    phases={phases}
                                    idleLabel={
                                        isDraftInvite(invite)
                                            ? t('links.inviteProgress.draftLabel', 'Entwurf – noch nicht eingeladen')
                                            : undefined
                                    }
                                    ariaLabel={t('links.inviteProgress.col.progress', 'Onboarding-Fortschritt')}
                                />
                            </DataTableCell>
                            <DataTableCell className={styles.metaCell}>
                                {/* NOT aria-hidden: the stacked mobile layout sets
                                    display:block on tr/td, which drops the table
                                    roles and with them the header↔cell association,
                                    so this label is the only thing naming the value.
                                    It is display:none on desktop, where the <th>
                                    already names it — so it never doubles up. */}
                                <span className={styles.cellLabel}>
                                    {t('links.inviteProgress.col.invitedAt', 'Eingeladen am')}
                                </span>
                                <time dateTime={invite.createDate} className={styles.date}>
                                    {formatDate(invite.createDate)}
                                </time>
                            </DataTableCell>
                            <DataTableCell className={styles.metaCell}>
                                <span className={styles.cellLabel}>
                                    {t('links.inviteProgress.col.lastActivity', 'Letzte Aktivität')}
                                </span>
                                <time dateTime={lastActivity} title={formatDate(lastActivity)} className={styles.date}>
                                    {formatRelativeTime(lastActivity, locale)}
                                </time>
                            </DataTableCell>
                            <DataTableCell className={styles.statusCell}>
                                {/* tabIndex on a badge: the explanation is the only
                                    place the vocabulary is defined, so it has to be
                                    reachable without a mouse as well (C3). */}
                                <M3Tooltip text={t(inviteStatusHint(invite).key, inviteStatusHint(invite).fallback)}>
                                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger: the badge is the only place the status vocabulary is explained, so it must be reachable without a mouse */}
                                    <span tabIndex={0} className={statusChipClass}>
                                        {isDeliveryUnconfirmed(invite)
                                            ? t(
                                                  'links.accountInvites.status.deliveryUnconfirmed',
                                                  'Versand unbestätigt',
                                              )
                                            : t(
                                                  `links.accountInvites.status.${invite.inviteStatus}`,
                                                  INVITE_STATUS_FALLBACK_LABELS[invite.inviteStatus],
                                              )}
                                    </span>
                                </M3Tooltip>
                                {hasQueueProblem(invite) && (
                                    <M3Tooltip text={queueProblemCopy(invite, t).hint}>
                                        <span
                                            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger: the badge explains the problem
                                            tabIndex={0}
                                            className={classNames(
                                                styles.statusChip,
                                                styles.statusChipDead,
                                                styles.problemChip,
                                            )}
                                            data-testid="queue-problem-badge"
                                        >
                                            {queueProblemCopy(invite, t).badge}
                                        </span>
                                    </M3Tooltip>
                                )}
                            </DataTableCell>
                            <DataTableCell align="right" className={styles.actionsCell}>
                                <div className={styles.actions}>
                                    {isWaitingForUnit(invite) ? (
                                        // Disable, don't hide: a manual send answers 409
                                        // UNIT_NOT_CREATED until the unit exists.
                                        <M3Tooltip
                                            text={t(
                                                'links.inviteProgress.action.resendWaiting',
                                                'Noch nicht möglich: Die Einladung geht automatisch raus, sobald die Beratungsstelle bzw. der Träger angelegt ist.',
                                            )}
                                        >
                                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger around a disabled button */}
                                            <span tabIndex={0} className={styles.disabledActionSlot}>
                                                <IconButton
                                                    icon={<ForwardToInboxOutlinedIcon />}
                                                    ariaLabel={t(
                                                        'links.inviteProgress.action.resend',
                                                        'Erinnerung erneut senden',
                                                    )}
                                                    disabled
                                                    onClick={() => onResend(invite)}
                                                />
                                            </span>
                                        </M3Tooltip>
                                    ) : (
                                        <IconButton
                                            icon={<ForwardToInboxOutlinedIcon />}
                                            ariaLabel={t(
                                                'links.inviteProgress.action.resend',
                                                'Erinnerung erneut senden',
                                            )}
                                            disabled={!actionable}
                                            onClick={() => onResend(invite)}
                                        />
                                    )}
                                    {/* C5: the copy icon used to stay live between
                                        two disabled neighbours, and pressing it in a
                                        terminal state only produced the "link only
                                        visible after send" refusal. An action whose
                                        single outcome is a refusal is a disabled
                                        action, so it follows the same rule. */}
                                    <IconButton
                                        icon={<ContentCopyOutlinedIcon />}
                                        ariaLabel={t('links.inviteProgress.action.copyLink', 'Einladungslink kopieren')}
                                        disabled={!actionable}
                                        onClick={() => onCopyLink(invite)}
                                    />
                                    <IconButton
                                        icon={<BlockOutlinedIcon />}
                                        ariaLabel={t('links.inviteProgress.action.revoke', 'Einladung widerrufen')}
                                        disabled={!isRevocable(invite)}
                                        className={styles.revokeAction}
                                        onClick={() => onRevoke(invite)}
                                    />
                                </div>
                            </DataTableCell>
                        </DataTableRow>
                    );
                })}
            </DataTable>
        </section>
    );
};
