import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
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
    PhaseStepper,
} from '../../../components/DataTable';
import { IconButton } from '../../../components/IconButton';
import { M3Tooltip } from '../../../components/M3Tooltip';
import { M3Button } from '../../../components/M3Button';
import { M3Checkbox } from '../../../components/M3Checkbox';
import {
    TOPIC_PERMISSION_LABEL_KEYS,
    TOPIC_PERMISSION_SHORT_LABEL_KEYS,
    TOPIC_PERMISSIONS,
    type InviteRole,
    type InviteViewerScope,
    type TopicPermission,
} from '../inviteModel';
import { RoleChip } from './RoleChip';
import { RowChipMenu } from './RowChipMenu';
import {
    countLifecyclePhases,
    derivePhases,
    isDraftInvite,
    formatRelativeTime,
    formatStepTime,
    hasQueueProblem,
    inviteDisplayName,
    inviteLastActivity,
    isDeadInvite,
    isWaitingForUnit,
    lifecycleOf,
    LIFECYCLE_PHASES,
    type LifecycleCounts,
    type LifecycleDetail,
    type LifecyclePhase,
    matchesInviteQuery,
    PHASE_AWAITING_FALLBACKS,
    PHASE_LABEL_FALLBACKS,
    phaseAwaitingLabelKey,
    phaseLabelKey,
    phaseReachedAt,
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

const PHASE_FALLBACK_LABELS: Record<LifecyclePhase, string> = {
    prepared: 'Vorbereitet',
    invited: 'Eingeladen',
    accountCreated: 'Konto angelegt',
    done: 'Fertig',
    needsAction: 'Braucht Aktion',
};

/** Breakdown order inside a tile; the two problems without a status of their own come last. */
const DETAIL_ORDER: LifecycleDetail[] = [
    'DRAFT',
    'WAITING_FOR_UNIT',
    'EMAIL_SENT',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED',
    'SUPERSEDED',
    'LINK_EXPIRED',
    'DELIVERY_FAILED',
    'PROVISIONING_FAILED',
    'NO_UNIT_ADMIN',
];

const DETAIL_FALLBACK_LABELS: Record<Exclude<LifecycleDetail, AccountInviteStatus>, [key: string, fallback: string]> = {
    DELIVERY_FAILED: ['links.inviteProgress.detail.deliveryFailed', 'Versand fehlgeschlagen'],
    NO_UNIT_ADMIN: ['links.inviteProgress.queueProblem', 'Keine BST-Admin'],
    LINK_EXPIRED: ['links.inviteProgress.detail.linkExpired', 'Link abgelaufen'],
    PROVISIONING_FAILED: ['links.inviteProgress.detail.provisioningFailed', 'Kontoanlage fehlgeschlagen'],
};

type Translate = (key: string, fallback: string) => string;

/** Badge, tooltip and step label of a queue problem, naming the unit the invite waits for. */
const queueProblemCopy = (invite: Pick<AccountInviteDTO, 'waitingForUnit'>, t: Translate) =>
    invite.waitingForUnit === 'TENANT'
        ? {
              badge: t('links.inviteProgress.queueProblemTenant', 'Keine Träger-Admin'),
              hint: t(
                  'links.inviteProgress.queueProblemTenantHint',
                  'Für diesen neuen Träger ist keine Träger-Admin-Einladung mehr offen (abgelaufen oder widerrufen). Laden Sie eine Träger-Admin mit derselben Nummer ein — dann rückt diese Einladung automatisch nach.',
              ),
              state: t('links.inviteProgress.queueProblemTenantState', 'Keine Träger-Admin – Einladung wartet'),
          }
        : {
              badge: t('links.inviteProgress.queueProblem', 'Keine BST-Admin'),
              hint: t(
                  'links.inviteProgress.queueProblemHint',
                  'Für diese neue Beratungsstelle ist keine BST-Admin-Einladung mehr offen (abgelaufen oder widerrufen). Laden Sie eine BST-Admin mit derselben Nummer ein — dann rückt diese Einladung automatisch nach.',
              ),
              state: t('links.inviteProgress.queueProblemState', 'Keine BST-Admin – Einladung wartet'),
          };

/** The tile is the board's only filter; `null` shows everything. */
type InviteFilter = LifecyclePhase | null;

/** The single predicate behind both the rendered rows and the selection pruning. */
const matchesFilter = (invite: AccountInviteDTO, filter: InviteFilter) =>
    filter == null || lifecycleOf(invite)?.phase === filter;

const isInviteRole = (role: AccountInviteDTO['targetRole']): role is InviteRole =>
    role === 'COUNSELLOR' || role === 'AGENCY_ADMIN' || role === 'TENANT_ADMIN';

/** An invite still able to change can be resent/revoked (terminal states cannot). */
const isActionable = (invite: AccountInviteDTO) =>
    invite.inviteStatus === 'DRAFT' || invite.inviteStatus === 'EMAIL_SENT';

/** A waiting invite has no link yet: it can be revoked, not sent or copied. */
const isRevocable = (invite: AccountInviteDTO) => isActionable(invite) || isWaitingForUnit(invite);

/** The topic permission only exists for counsellors, and stays editable after the account exists. */
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
    /** Who looks at the board: decides which roles the role chip may hand out. */
    viewerScope?: InviteViewerScope;
    /** Changes the role of an invite not accepted yet; without it those entries stay disabled. */
    onRoleChange?: (invite: AccountInviteDTO, role: InviteRole) => void;
    /** Adds a role to an existing account ("+ auch BST-Admin"). */
    onRoleAdd?: (invite: AccountInviteDTO, role: InviteRole) => void;
    /** Invite ids whose role is being saved right now. */
    roleSavingIds?: number[];
    /** The server's tile counts over every page of the tab; without them the board counts its rows. */
    tileCounts?: LifecycleCounts;
    /** Search field for the card toolbar (left, grows). */
    toolbarSearch?: ReactNode;
    /** Trailing toolbar controls, e.g. the more-menu (right of the pagination). */
    toolbarActions?: ReactNode;
}

/** Board widths from which all seven columns fit without squeezing the one-line track. */
const WIDE_MIN_WIDTH = { counsellor: 1180, tenant: 1500 } as const;

/** Rows of the pre-drawn table: the board never looks like an empty box. */
const PLACEHOLDER_ROWS = 5;

const CHECK_GLYPH = (
    <svg className={styles.chipCheck} width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="currentColor" />
    </svg>
);

/** A faint, inert stand-in row (aria-hidden): checkbox, name bars, three beads, dates, a chip. */
const PlaceholderRow = ({ compact, opacity }: { compact: boolean; opacity?: number }) => (
    <tr aria-hidden className={styles.placeholderRow} style={opacity != null ? { opacity } : undefined}>
        <td className={styles.selectCell}>
            <span className={styles.phCheckbox} />
        </td>
        <td>
            <span className={styles.phBar} />
            <span className={classNames(styles.phBar, styles.phBarSub)} />
        </td>
        <td>
            <span className={styles.phTrack}>
                <span className={styles.phBead} />
                <span className={styles.phLine} />
                <span className={styles.phBead} />
                <span className={styles.phLine} />
                <span className={styles.phBead} />
            </span>
        </td>
        {compact ? (
            <>
                <td>
                    <span className={classNames(styles.phBar, styles.phBarDate)} />
                    <span className={classNames(styles.phBar, styles.phBarSub, styles.phBarDate)} />
                </td>
                <td className={styles.phChipCell}>
                    <span className={styles.phChip} />
                </td>
            </>
        ) : (
            <>
                <td>
                    <span className={classNames(styles.phBar, styles.phBarDate)} />
                </td>
                <td>
                    <span className={classNames(styles.phBar, styles.phBarSub, styles.phBarDate)} />
                </td>
                <td>
                    <span className={styles.phChip} />
                </td>
                <td />
            </>
        )}
    </tr>
);

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
    const title = (option: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[option].title);
    const description = (option: TopicPermission) => t(...TOPIC_PERMISSION_LABEL_KEYS[option].description);
    const short = t(...TOPIC_PERMISSION_SHORT_LABEL_KEYS[value]);

    return (
        <RowChipMenu
            label={t('links.inviteProgress.topicsChip', 'Themen: {{value}}', { value: short })}
            ariaLabel={`${t('links.inviteProgress.topicsFor', 'Themen für {{name}}', { name: displayName })}: ${short}`}
            tooltip={disabled && disabledReason ? disabledReason : `${title(value)} – ${description(value)}`}
            disabled={disabled}
            options={TOPIC_PERMISSIONS.map((option) => ({
                key: option,
                title: title(option),
                description: description(option),
                checked: option === value,
            }))}
            onSelect={(key) => onChange(key as TopicPermission)}
        />
    );
};

/**
 * The "Onboarding" tracking board (Links page): one card with a sticky toolbar
 * (search slot, compact pagination, actions slot, filter chips) over the
 * phase-progress table (one row per invitee). Narrow boards reflow to five
 * columns instead of scrolling sideways. Rendering only — data and actions
 * stay in `AccountInvitesTab`.
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
    viewerScope = 'platform',
    onRoleChange,
    onRoleAdd,
    roleSavingIds = [],
    tileCounts,
    toolbarSearch,
    toolbarActions,
}: InviteProgressBoardProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n?.language || 'de';
    const [filter, setFilter] = useState<InviteFilter>(null);
    // Phones only (CSS): the chip row folds behind a toggle; the selected chip stays visible.
    const [filtersOpen, setFiltersOpen] = useState(false);
    const chipsId = useId();
    const [sort, setSort] = useState<DataTableSort | null>(null);

    const isTenantTab = targetRole === 'TENANT_ADMIN';
    const boardRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLSpanElement>(null);
    // null = not measured (jsdom, first paint): the wide layout is today's layout.
    const [boardWidth, setBoardWidth] = useState<number | null>(null);
    const [toolbarHeight, setToolbarHeight] = useState(0);
    const [stuck, setStuck] = useState(false);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target === boardRef.current && entry.contentRect.width > 0) {
                    setBoardWidth(entry.contentRect.width);
                }
                if (entry.target === toolbarRef.current) {
                    setToolbarHeight(entry.target.getBoundingClientRect().height);
                }
            });
        });
        if (boardRef.current) observer.observe(boardRef.current);
        if (toolbarRef.current) observer.observe(toolbarRef.current);
        return () => observer.disconnect();
    }, []);

    // The sentinel sits at the card's top edge: once it has scrolled above the
    // viewport, the toolbar is stuck and gets its shadow.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            setStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0));
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const compact = boardWidth != null && boardWidth < WIDE_MIN_WIDTH[isTenantTab ? 'tenant' : 'counsellor'];
    // The Träger track is longer (up to seven steps), so its lines hold one step more.
    const stepsPerLine = isTenantTab ? 4 : 3;

    const detailLabel = (detail: LifecycleDetail) =>
        detail in DETAIL_FALLBACK_LABELS
            ? t(...DETAIL_FALLBACK_LABELS[detail as keyof typeof DETAIL_FALLBACK_LABELS])
            : t(`links.accountInvites.status.${detail}`, INVITE_STATUS_FALLBACK_LABELS[detail as AccountInviteStatus]);
    // "2 Draft · 1 Wartet": which raw statuses make up a chip's count.
    const detailBreakdown = (details: Partial<Record<LifecycleDetail, number>>) =>
        DETAIL_ORDER.filter((detail) => (details[detail] ?? 0) > 0)
            .map((detail) => `${details[detail]} ${detailLabel(detail)}`)
            .join(' · ') || t('links.inviteProgress.detail.none', 'keine');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // A changed filter always restarts at page 1 — page 3 of a filter that only
    // has one page would otherwise show the empty slot with rows available.
    useEffect(() => {
        setPage(1);
    }, [filter, searchQuery]);

    // The chips count the WHOLE list, not the search result: they are the
    // overview the search is run against, and a "3 Abgeschlossen" that silently
    // meant "3 among the rows matching fisch" would be a different number every
    // keystroke.
    const phaseCounts = useMemo(() => tileCounts ?? countLifecyclePhases(invites), [tileCounts, invites]);
    const allCount = tileCounts
        ? LIFECYCLE_PHASES.reduce((sum, phase) => sum + tileCounts[phase].total, 0)
        : invites.length;

    const searched = useMemo(
        () => (searchQuery.trim() ? invites.filter((invite) => matchesInviteQuery(invite, searchQuery)) : invites),
        [invites, searchQuery],
    );

    const filtered = useMemo(() => searched.filter((invite) => matchesFilter(invite, filter)), [searched, filter]);

    /**
     * Switching a chip also prunes the selection down to the rows the
     * new filter still shows. The bulk actions above the board act on the
     * selection, NOT on what is on screen — a row hidden by a filter would
     * otherwise stay silently checked and get resent or revoked without the
     * admin ever seeing it. Complementary to the `searched`-based effect below,
     * which covers the search-query dimension.
     */
    const applyFilter = (next: InviteFilter) => {
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

    const columns = useMemo(() => {
        const select = { key: 'select', ariaLabel: t('links.inviteProgress.col.select', 'Auswahl'), width: 48 };
        const recipient = {
            key: 'recipient',
            label: t('links.inviteProgress.col.recipient', 'Empfänger'),
            sortable: true,
        };
        const progress = { key: 'progress', label: t('links.inviteProgress.col.progress', 'Onboarding-Fortschritt') };
        const invitedAt = t('links.inviteProgress.col.invitedAt', 'Eingeladen am');
        const lastActivity = t('links.inviteProgress.col.lastActivity', 'Letzte Aktivität');
        const status = t('links.inviteProgress.col.status', 'Status');
        const actions = t('links.inviteProgress.col.actions', 'Aktionen');
        // Two-line header: the space keeps the accessible name readable ("Eingeladen am Letzte Aktivität").
        const stacked = (main: string, sub: string, end = false) => (
            <span className={classNames(styles.headStack, { [styles.headStackEnd]: end })}>
                <span>{main}</span> <span className={styles.headSub}>{sub}</span>
            </span>
        );
        if (compact) {
            return [
                select,
                recipient,
                progress,
                { key: 'invitedAt', label: stacked(invitedAt, lastActivity), sortable: true },
                { key: 'status', label: stacked(status, actions, true), align: 'right' as const },
            ];
        }
        return [
            select,
            recipient,
            progress,
            { key: 'invitedAt', label: invitedAt, sortable: true },
            { key: 'lastActivity', label: lastActivity },
            { key: 'status', label: status },
            { key: 'actions', label: actions, align: 'right' as const },
        ];
    }, [t, compact]);

    const toggleSelection = (invite: AccountInviteDTO, next: boolean) => {
        onSelectionChange(next ? [...selectedIds, invite.id] : selectedIds.filter((id) => id !== invite.id));
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

    const emptyUnfiltered = invites.length === 0;
    const unfiltered = filter == null && !searchQuery.trim();
    // A short list gets a hint and fading stand-in rows, so the table reads as "fills up here".
    const showNextHint = !loading && unfiltered && invites.length >= 1 && invites.length <= 3;

    const chips: { key: InviteFilter; label: string; count: number; breakdown?: string; error?: boolean }[] = [
        { key: null, label: t('links.inviteProgress.phaseTile.all', 'Alle'), count: allCount },
        ...LIFECYCLE_PHASES.map((phase) => ({
            key: phase,
            label: t(`links.inviteProgress.phaseTile.${phase}`, PHASE_FALLBACK_LABELS[phase]),
            count: phaseCounts[phase].total,
            breakdown: detailBreakdown(phaseCounts[phase].details),
            error: phase === 'needsAction',
        })),
    ];

    const pagination = (
        <DataTablePagination
            compact
            page={effectivePage}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
            }}
        />
    );

    const renderRow = (invite: AccountInviteDTO) => {
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
        const phases = derivePhases(invite).map((phase) => {
            const reachedAt = phaseReachedAt(phase.key, invite);
            return {
                key: phase.key,
                state: phase.state,
                ...(reachedAt ? { at: formatStepTime(reachedAt, locale) } : {}),
                ...(queueProblem && phase.state === 'warning'
                    ? {
                          stateLabel: queueProblemCopy(invite, t).state,
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
            };
        });

        /* NOT aria-hidden: the stacked mobile layout sets display:block on
           tr/td, which drops the table roles and with them the header↔cell
           association, so this label is the only thing naming the value.
           It is display:none on desktop, where the <th> already names it. */
        const invitedAtLabel = (
            <span className={styles.cellLabel}>{t('links.inviteProgress.col.invitedAt', 'Eingeladen am')}</span>
        );
        const lastActivityLabel = (
            <span className={styles.cellLabel}>{t('links.inviteProgress.col.lastActivity', 'Letzte Aktivität')}</span>
        );
        const invitedAtValue = (
            <time dateTime={invite.createDate} className={styles.date}>
                {formatDate(invite.createDate)}
            </time>
        );
        const lastActivityValue = (
            <time dateTime={lastActivity} title={formatDate(lastActivity)} className={styles.date}>
                {formatRelativeTime(lastActivity, locale)}
            </time>
        );

        const statusBadges = (
            <>
                {/* tabIndex on a badge: the explanation is the only
                    place the vocabulary is defined, so it has to be
                    reachable without a mouse as well (C3). */}
                <M3Tooltip text={t(inviteStatusHint(invite).key, inviteStatusHint(invite).fallback)}>
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger: the badge is the only place the status vocabulary is explained, so it must be reachable without a mouse */}
                    <span tabIndex={0} className={statusChipClass}>
                        {isDeliveryUnconfirmed(invite)
                            ? t('links.accountInvites.status.deliveryUnconfirmed', 'Versand unbestätigt')
                            : t(
                                  `links.accountInvites.status.${invite.inviteStatus}`,
                                  INVITE_STATUS_FALLBACK_LABELS[invite.inviteStatus],
                              )}
                    </span>
                </M3Tooltip>
                {queueProblem && (
                    <M3Tooltip text={queueProblemCopy(invite, t).hint}>
                        <span
                            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger: the badge explains the problem
                            tabIndex={0}
                            className={classNames(styles.statusChip, styles.statusChipDead, styles.problemChip)}
                            data-testid="queue-problem-badge"
                        >
                            {queueProblemCopy(invite, t).badge}
                        </span>
                    </M3Tooltip>
                )}
            </>
        );

        const actions = (
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
                                ariaLabel={t('links.inviteProgress.action.resend', 'Erinnerung erneut senden')}
                                disabled
                                onClick={() => onResend(invite)}
                            />
                        </span>
                    </M3Tooltip>
                ) : (
                    <IconButton
                        icon={<ForwardToInboxOutlinedIcon />}
                        ariaLabel={t('links.inviteProgress.action.resend', 'Erinnerung erneut senden')}
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
        );

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
                            {isInviteRole(invite.targetRole) ? (
                                <RoleChip
                                    invite={invite}
                                    displayName={displayName}
                                    viewer={viewerScope}
                                    tab={isTenantTab ? 'tenant' : 'counsellor'}
                                    saving={roleSavingIds.includes(invite.id)}
                                    onChangeRole={onRoleChange && ((role) => onRoleChange(invite, role))}
                                    onAddRole={onRoleAdd && ((role) => onRoleAdd(invite, role))}
                                />
                            ) : (
                                <span className={styles.roleChip}>
                                    {t(`links.inviteProgress.role.${invite.targetRole}`, invite.targetRole)}
                                </span>
                            )}
                            {isTenantTab && invite.tenantId != null && (
                                <span className={styles.idHint}>
                                    {t('links.inviteProgress.tenantIdShort', 'Träger-ID {{id}}', {
                                        id: invite.tenantId,
                                    })}
                                </span>
                            )}
                            {showTopicPermission && hasEditableTopicPermission(invite) && (
                                <TopicPermissionChip
                                    disabled={!onTopicPermissionChange || topicPermissionSavingIds.includes(invite.id)}
                                    disabledReason={onTopicPermissionChange ? undefined : topicPermissionLockedReason}
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
                        maxPerLine={compact ? stepsPerLine : undefined}
                        idleLabel={
                            isDraftInvite(invite)
                                ? t('links.inviteProgress.draftLabel', 'Entwurf – noch nicht eingeladen')
                                : undefined
                        }
                        ariaLabel={t('links.inviteProgress.col.progress', 'Onboarding-Fortschritt')}
                    />
                </DataTableCell>
                {compact ? (
                    <>
                        <DataTableCell className={styles.metaStackCell}>
                            <span className={styles.metaLine}>
                                {invitedAtLabel}
                                {invitedAtValue}
                            </span>
                            <span className={classNames(styles.metaLine, styles.metaSub)}>
                                {lastActivityLabel}
                                {lastActivityValue}
                            </span>
                        </DataTableCell>
                        <DataTableCell align="right" className={styles.statusActionsCell}>
                            <div className={styles.statusStack}>{statusBadges}</div>
                            {actions}
                        </DataTableCell>
                    </>
                ) : (
                    <>
                        <DataTableCell className={styles.metaCell}>
                            {invitedAtLabel}
                            {invitedAtValue}
                        </DataTableCell>
                        <DataTableCell className={styles.metaCell}>
                            {lastActivityLabel}
                            {lastActivityValue}
                        </DataTableCell>
                        <DataTableCell className={styles.statusCell}>{statusBadges}</DataTableCell>
                        <DataTableCell align="right" className={styles.actionsCell}>
                            {actions}
                        </DataTableCell>
                    </>
                )}
            </DataTableRow>
        );
    };

    return (
        // The section is deliberately unnamed: naming it with the same string as
        // the chip group below announced "Onboarding-Übersicht" twice in a row.
        // The chip group and the table each carry their own name.
        <section
            ref={boardRef}
            className={classNames(styles.board, { [styles.boardCompact]: compact })}
            data-layout={compact ? 'compact' : 'wide'}
        >
            <div
                className={classNames(styles.card, { [styles.cardStuck]: stuck })}
                style={{ '--invite-board-toolbar-height': `${toolbarHeight}px` } as CSSProperties}
            >
                <span ref={sentinelRef} aria-hidden className={styles.stickySentinel} />
                <div ref={toolbarRef} className={styles.toolbar}>
                    <div className={styles.toolbarRow}>
                        {toolbarSearch && <div className={styles.toolbarSearch}>{toolbarSearch}</div>}
                        <button
                            type="button"
                            aria-controls={chipsId}
                            aria-expanded={filtersOpen}
                            className={styles.filterToggle}
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            <TuneOutlinedIcon aria-hidden fontSize="small" />
                            {t('links.inviteProgress.filterToggle', 'Filter')}
                            <KeyboardArrowDownIcon
                                aria-hidden
                                className={classNames(styles.filterToggleChevron, {
                                    [styles.filterToggleChevronOpen]: filtersOpen,
                                })}
                                fontSize="small"
                            />
                        </button>
                        <div className={styles.toolbarPagination}>{pagination}</div>
                        {toolbarActions && <div className={styles.toolbarActions}>{toolbarActions}</div>}
                    </div>
                    <div
                        id={chipsId}
                        className={styles.chips}
                        data-collapsed={!filtersOpen}
                        role="group"
                        aria-label={t('links.inviteProgress.summaryLabel', 'Onboarding-Übersicht')}
                    >
                        {chips.map((chip) => {
                            const selected = filter === chip.key;
                            return (
                                <button
                                    key={chip.key ?? 'all'}
                                    type="button"
                                    aria-pressed={selected}
                                    title={chip.breakdown}
                                    className={classNames(styles.chip, {
                                        [styles.chipSelected]: selected,
                                        [styles.chipAlert]: chip.error && chip.count > 0,
                                    })}
                                    onClick={() => applyFilter(chip.key == null || selected ? null : chip.key)}
                                >
                                    {selected && CHECK_GLYPH}
                                    <span className={styles.chipLabel}>{chip.label}</span>{' '}
                                    <span className={styles.chipCount}>{chip.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.tableArea}>
                    <DataTable
                        className={styles.dataTable}
                        ariaLabel={t('links.inviteProgress.tableLabel', 'Einladungen und Onboarding-Fortschritt')}
                        stickyHeader
                        stackedOnMobile
                        loading={loading}
                        skeletonColumns={columns.length}
                        isEmpty={sorted.length === 0 && !emptyUnfiltered}
                        empty={
                            <div className={styles.empty}>
                                <EmptyStateIcon aria-hidden className={styles.emptyGraphic} />
                                <p className={styles.emptyBody}>
                                    {t('links.inviteProgress.empty.filtered', 'Keine Einladungen für diesen Filter.')}
                                </p>
                            </div>
                        }
                        header={<DataTableHeader columns={columns} sort={sort} onSortChange={setSort} />}
                    >
                        {emptyUnfiltered
                            ? Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
                                  // eslint-disable-next-line react/no-array-index-key -- inert stand-ins without identity
                                  <PlaceholderRow key={index} compact={compact} />
                              ))
                            : pageRows.map((invite) => renderRow(invite))}
                        {showNextHint && (
                            <tr className={styles.hintRow}>
                                <td colSpan={columns.length}>
                                    <div className={styles.hint}>
                                        <EmptyStateIcon aria-hidden className={styles.hintGraphic} />
                                        <div>
                                            <p className={styles.hintTitle}>
                                                {t(
                                                    'links.inviteProgress.nextHint.title',
                                                    'Hier erscheinen die nächsten Einladungen',
                                                )}
                                            </p>
                                            <p className={styles.hintBody}>
                                                {t(
                                                    'links.inviteProgress.nextHint.body',
                                                    'Im Einladungsformular ausfüllen und senden – jede Einladung bekommt eine eigene Zeile.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {showNextHint &&
                            Array.from({ length: PLACEHOLDER_ROWS - invites.length }, (_, index) => (
                                <PlaceholderRow
                                    // eslint-disable-next-line react/no-array-index-key -- inert stand-ins without identity
                                    key={index}
                                    compact={compact}
                                    opacity={Math.max(0.35, 1 - index * 0.25)}
                                />
                            ))}
                    </DataTable>
                    {emptyUnfiltered && !loading && (
                        <div className={styles.emptyOverlay}>
                            <div className={classNames(styles.empty, styles.emptyBox)}>
                                <EmptyStateIcon aria-hidden className={styles.emptyGraphic} />
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
