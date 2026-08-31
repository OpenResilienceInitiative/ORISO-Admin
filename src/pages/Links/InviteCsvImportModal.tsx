import { useMemo, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, message, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import { extractApiErrorMessageOrNull } from '../../utils/extractApiErrorMessage';
import { ListingTable } from '../../components/ListingTable';
import { Modal, DialogButton } from '../../components/Modal';
import { assignBatchTenantIds, type InviteCsvRejectionReason, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import styles from './inviteCsvImport.module.scss';

/**
 * Payload per row — the tab wraps it into a full createAccountInvite request and
 * decides which id space `id` belongs to (see `InviteCsvIdKind`).
 */
export interface InviteCsvCreateRow {
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    /** Resolved 4th-column id: the file's value, or the batch-assigned one on the Träger tab. */
    id?: number;
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
    rejectedReason?: InviteCsvRejectionReason;
    state: RowState;
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
    /** Creates ONE invite; rejections (e.g. a 409 `Response`) mark the row as failed. */
    createInvite: (row: InviteCsvCreateRow) => Promise<void>;
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
    createInvite,
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
                state: 'pending',
            })),
            ...parseResult.rejected.map<ImportRow>((row) => ({
                line: row.line,
                email: (row.cells[0] ?? '').trim(),
                firstName: (row.cells[1] ?? '').trim(),
                lastName: (row.cells[2] ?? '').trim(),
                rejectedReason: row.reason,
                state: 'pending',
            })),
        ].sort((a, b) => a.line - b.line),
    );
    const [running, setRunning] = useState(false);

    const importableRows = useMemo(() => rows.filter((row) => !row.rejectedReason), [rows]);

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
            patchRow(row.line, { state: 'creating', conflict: false, emailTaken: false, forbidden: false });
            try {
                // eslint-disable-next-line no-await-in-loop
                await createInvite({
                    recipientEmail: row.email,
                    firstName: row.firstName.trim() || undefined,
                    lastName: row.lastName.trim() || undefined,
                    id,
                });
                created += 1;
                patchRow(row.line, { state: 'created', explicitId: id });
            } catch (error) {
                failed += 1;
                const conflict = error instanceof Response && error.status === 409;
                const forbidden = error instanceof Response && error.status === 403;
                if (forbidden && firstForbidden == null) {
                    firstForbidden = error as Response;
                }
                patchRow(row.line, {
                    state: 'failed',
                    conflict,
                    forbidden,
                    emailTaken:
                        conflict &&
                        (error as Response).headers.get(FETCH_ERRORS.X_REASON) === X_REASON.EMAIL_NOT_AVAILABLE,
                });
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

    const isTenantId = idKind === 'tenant';
    const idLabel = isTenantId
        ? t('links.accountInvites.tenantId', 'Träger-ID')
        : t('links.accountInvites.agencyId', 'Beratungsstellen-ID');

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
        if (row.conflict) {
            return t('links.csvImport.status.idTaken', '{{idLabel}} vergeben', { idLabel });
        }
        return t('links.csvImport.status.failed', 'Fehlgeschlagen');
    };

    const statusTag = (row: ImportRow) => {
        if (row.rejectedReason) {
            const reason =
                row.rejectedReason === 'invalidEmail'
                    ? t('links.csvImport.reason.invalidEmail', 'Ungültige E-Mail-Adresse (Zeile {{line}})', {
                          line: row.line,
                      })
                    : t('links.csvImport.reason.invalidId', 'Ungültige {{idLabel}} (Zeile {{line}})', {
                          idLabel,
                          line: row.line,
                      });
            return (
                <Tooltip title={reason}>
                    <Tag color="red">{t('links.csvImport.status.rejected', 'Abgelehnt')}</Tag>
                </Tooltip>
            );
        }
        switch (row.state) {
            case 'creating':
                return <Tag color="gold">{t('links.csvImport.status.creating', 'Wird angelegt …')}</Tag>;
            case 'created':
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
            render: (_: unknown, row: ImportRow) => statusTag(row),
        },
        {
            title: t('links.accountInvites.email', 'E-Mail'),
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: t('links.accountInvites.firstName', 'Vorname'),
            key: 'firstName',
            render: (_: unknown, row: ImportRow) =>
                nameCell(row, 'firstName', t('links.accountInvites.firstName', 'Vorname')),
        },
        {
            title: t('links.composer.lastName', 'Name'),
            key: 'lastName',
            render: (_: unknown, row: ImportRow) => nameCell(row, 'lastName', t('links.composer.lastName', 'Name')),
        },
        {
            title: idLabel,
            key: 'id',
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
            title: '',
            key: 'remove',
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
            width={880}
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
                          'links.csvImport.columnsHint',
                          'Spaltenreihenfolge: E-Mail, Vorname, Name, Träger-ID (optional) — leere Träger-IDs werden automatisch vergeben.',
                      )
                    : t(
                          'links.csvImport.columnsHintAgency',
                          'Spaltenreihenfolge: E-Mail, Vorname, Name, Beratungsstellen-ID (optional) — eine angegebene ID muss noch frei sein, leere Felder werden beim Anlegen automatisch vergeben.',
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
