import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
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
import { M3Button } from '../../../components/M3Button';
import { M3Checkbox } from '../../../components/M3Checkbox';
import {
    countInviteBuckets,
    deriveInviteBucket,
    derivePhases,
    formatRelativeTime,
    INVITE_BUCKETS,
    InviteBucket,
    inviteDisplayName,
    inviteLastActivity,
    isDeadInvite,
    PHASE_LABEL_FALLBACKS,
    phaseLabelKey,
} from './derivePhases';
import styles from './inviteProgressBoard.module.scss';

/**
 * Send-state chip wording (#316): German product labels; the fallbacks double
 * as the i18n defaults for both locale files.
 */
export const INVITE_STATUS_FALLBACK_LABELS: Record<AccountInviteStatus, string> = {
    DRAFT: 'Draft',
    EMAIL_SENT: 'Gesendet',
    ACCEPTED: 'Angenommen',
    EXPIRED: 'Abgelaufen',
    REVOKED: 'Widerrufen',
    SUPERSEDED: 'Ersetzt',
};

const STATUS_FILTER_ORDER: AccountInviteStatus[] = [
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

export interface InviteProgressBoardProps {
    invites: AccountInviteDTO[];
    loading: boolean;
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
}

/**
 * The "Onboarding" tracking board (Links page): summary tiles that filter,
 * status chips, the phase-progress table (one row per invitee) and client-side
 * pagination. Rendering only — data and actions stay in `AccountInvitesTab`.
 */
export const InviteProgressBoard = ({
    invites,
    loading,
    targetRole,
    selectedIds,
    onSelectionChange,
    isRowSelectable,
    selectionDisabled = false,
    onResend,
    onCopyLink,
    onRevoke,
    onInviteCta,
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
    }, [filter]);

    const bucketCounts = useMemo(() => countInviteBuckets(invites), [invites]);

    const filtered = useMemo(
        () => (filter ? invites.filter((invite) => matchesFilter(invite, filter)) : invites),
        [invites, filter],
    );

    /**
     * Switching a tile or a chip also prunes the selection down to the rows the
     * new filter still shows. The bulk actions above the board act on the
     * selection, NOT on what is on screen — a row hidden by a filter would
     * otherwise stay silently checked and get resent or revoked without the
     * admin ever seeing it. This mirrors the pruning `AccountInvitesTab` already
     * does when a reload drops a row from the list.
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
                    const phases = derivePhases(invite).map((phase) => ({
                        key: phase.key,
                        state: phase.state,
                        label: t(phaseLabelKey(phase.key), PHASE_LABEL_FALLBACKS[phase.key]),
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
                                    </span>
                                </div>
                            </DataTableCell>
                            <DataTableCell className={styles.progressCell}>
                                <PhaseStepper
                                    phases={phases}
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
                                <span className={classNames(styles.statusChip, { [styles.statusChipDead]: dead })}>
                                    {t(
                                        `links.accountInvites.status.${invite.inviteStatus}`,
                                        INVITE_STATUS_FALLBACK_LABELS[invite.inviteStatus],
                                    )}
                                </span>
                            </DataTableCell>
                            <DataTableCell align="right" className={styles.actionsCell}>
                                <div className={styles.actions}>
                                    <IconButton
                                        icon={<ForwardToInboxOutlinedIcon />}
                                        ariaLabel={t('links.inviteProgress.action.resend', 'Erinnerung erneut senden')}
                                        disabled={!actionable}
                                        onClick={() => onResend(invite)}
                                    />
                                    <IconButton
                                        icon={<ContentCopyOutlinedIcon />}
                                        ariaLabel={t('links.inviteProgress.action.copyLink', 'Einladungslink kopieren')}
                                        onClick={() => onCopyLink(invite)}
                                    />
                                    <IconButton
                                        icon={<BlockOutlinedIcon />}
                                        ariaLabel={t('links.inviteProgress.action.revoke', 'Einladung widerrufen')}
                                        disabled={!actionable}
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
