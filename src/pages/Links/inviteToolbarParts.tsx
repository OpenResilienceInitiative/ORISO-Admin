import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { message, type MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { GlobalSearchMenu } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import {
    downloadInviteCsvTemplate,
    inviteCsvColumnsForTab,
    type InviteCsvTemplateLabels,
} from './csv/inviteCsvTemplate';
import { ROLE_LABEL_KEYS, type InviteSendMode } from './inviteModel';
import type { InviteTab } from './inviteRules';
import styles from './inviteComposer.module.scss';

export interface InviteCsvProps {
    /** Parsed in the browser; the file is never uploaded. */
    onParsed: (result: ParseInviteCsvResult, sendMode: InviteSendMode) => void;
    /** Shows the CSV entries disabled with this reason instead of hiding them. */
    blockedReason?: string;
}

export interface InviteBulkProps {
    count: number;
    /** Ordinary/unknown-purpose selections require a template; setup-only selections do not. */
    requiresTemplate?: boolean;
    onSend: () => void;
    onClear: () => void;
    /** Opens the revoke confirmation; there is no hard delete. */
    onDeleteSelected: () => void;
}

// `File.text()` with a FileReader fallback: jsdom implements only the latter.
const readFileText = (file: File): Promise<string> =>
    typeof file.text === 'function'
        ? file.text()
        : new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ''));
              reader.onerror = () => reject(reader.error);
              reader.readAsText(file);
          });

interface InviteMoreMenuOptions {
    tab: InviteTab;
    csv?: InviteCsvProps;
    bulk?: InviteBulkProps;
    /** The send mode the CSV import captures. */
    sendMode: InviteSendMode;
    selectedTemplate?: InviteEmailTemplateDTO;
}

/** The ⋮ menu (CSV import, CSV template, delete selected) and the hidden file picker it opens. */
export const useInviteMoreMenu = ({ tab, csv, bulk, sendMode, selectedTemplate }: InviteMoreMenuOptions) => {
    const { t } = useTranslation();
    const csvInputRef = useRef<HTMLInputElement>(null);

    const handleCsvFile = async (file: File) => {
        // Direct mode needs a template, or the batch would silently create without sending.
        if (sendMode === 'direct' && selectedTemplate == null) {
            message.error(t('links.accountInvites.templateRequired', 'Bitte zuerst ein Template auswählen.'));
            return;
        }
        try {
            const result = parseInviteCsv(await readFileText(file));
            if (result.rows.length === 0 && result.rejected.length === 0) {
                message.info(t('links.csvImport.emptyFile', 'Die CSV-Datei enthält keine Empfänger.'));
            } else {
                csv?.onParsed(result, sendMode);
            }
        } catch {
            message.error(t('links.csvImport.readFailed', 'CSV-Datei konnte nicht gelesen werden.'));
        }
    };
    const onCsvPicked = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Cleared so picking the same file again still fires a change.
        if (csvInputRef.current) csvInputRef.current.value = '';
        if (file) handleCsvFile(file);
    };

    // The id column is the Träger-ID on the Träger tab and the agency id elsewhere.
    const csvIdLabel =
        tab === 'tenant'
            ? t('links.accountInvites.tenantId', 'Träger-ID')
            : t('links.accountInvites.agencyId', 'Beratungsstellen-ID');
    // One label set per tab for the menu hint and the template header, so the two cannot drift apart.
    const allCsvLabels: Required<InviteCsvTemplateLabels> = {
        email: t('links.accountInvites.email', 'E-Mail'),
        firstName: t('links.accountInvites.firstName', 'Vorname'),
        lastName: t('links.composer.lastName', 'Name'),
        id: csvIdLabel,
        target: t('links.csvImport.col.target', 'Ziel'),
        role: t('links.composer.role', 'Rolle'),
        template: t('links.composer.template', 'Vorlage'),
        topicPermission: t('links.composer.topics', 'Themen & Fachbereiche'),
        alsoCounsellor: t('links.composer.alsoCounsellor.label', 'Berät auch'),
    };
    const csvColumns = Object.fromEntries(
        inviteCsvColumnsForTab(tab === 'tenant' ? 'tenant' : 'counsellor').map((key) => [key, allCsvLabels[key]]),
    ) as unknown as InviteCsvTemplateLabels;

    const moreMenuItems: NonNullable<MenuProps['items']> = [];
    if (csv) {
        const csvBlocked = csv.blockedReason != null;
        const csvLabel = (csvHint: string) => (
            <span className={styles.csvImportEntry}>
                <UploadOutlined aria-hidden />
                <span className={styles.csvImportLabel}>
                    {t('links.csvImport.menuEntry', 'CSV-Datei importieren')}
                    <span className={styles.csvImportHint}>{csvHint}</span>
                </span>
            </span>
        );
        moreMenuItems.push({
            key: 'csv-import',
            disabled: csvBlocked,
            // The import expects a fixed column order, and this menu is the only place to learn it.
            label: csvLabel(
                csvBlocked
                    ? (csv.blockedReason as string)
                    : t('links.csvImport.columns', 'Spalten: {{columns}}', {
                          columns: Object.values({
                              ...csvColumns,
                              id: `${csvIdLabel} ${t('links.csvImport.optional', '(optional)')}`,
                          }).join(', '),
                      }),
            ),
        });
        moreMenuItems.push({
            key: 'csv-template',
            disabled: csvBlocked,
            icon: <DownloadOutlined aria-hidden />,
            label: t('links.csvImport.downloadTemplate', 'CSV-Vorlage herunterladen'),
        });
    }
    if (bulk) {
        moreMenuItems.push({
            key: 'delete-selected',
            danger: true,
            disabled: bulk.count === 0,
            icon: <DeleteOutlined aria-hidden />,
            label: t('links.bulk.deleteSelected', 'Ausgewählte löschen'),
        });
    }

    const moreMenu: MenuProps = {
        items: moreMenuItems,
        // Mouse and keyboard both land here, so the hidden picker opens for either.
        onClick: ({ key }) => {
            if (key === 'csv-import') {
                csvInputRef.current?.click();
                return;
            }
            if (key === 'delete-selected') {
                bulk?.onDeleteSelected();
                return;
            }
            if (key === 'csv-template') {
                downloadInviteCsvTemplate(
                    csvColumns,
                    t('links.csvImport.templateFileName', 'oriso-einladungen-vorlage.csv'),
                    // German column values on purpose: the parser accepts them in any UI language.
                    {
                        role: ROLE_LABEL_KEYS[tab === 'tenant' ? 'TENANT_ADMIN' : 'COUNSELLOR'][1],
                        idKind: tab === 'tenant' ? 'tenant' : 'agency',
                    },
                );
            }
        },
    };

    const moreButton: ReactNode =
        moreMenuItems.length > 0 ? (
            <GlobalSearchMenu menu={moreMenu}>
                <button
                    aria-haspopup="menu"
                    aria-label={t('links.csvImport.moreMenuLabel', 'Weitere Aktionen')}
                    className={styles.moreButton}
                    type="button"
                >
                    <MoreOutlined aria-hidden />
                </button>
            </GlobalSearchMenu>
        ) : undefined;

    const csvInput: ReactNode = csv ? (
        <input ref={csvInputRef} accept=".csv,text/csv" hidden type="file" onChange={onCsvPicked} />
    ) : null;

    return { moreButton, csvInput };
};

interface InviteBulkSendOptions {
    tab: InviteTab;
    bulk?: InviteBulkProps;
    selectedTemplate?: InviteEmailTemplateDTO;
    submitting: boolean;
    /** Fills the invite card's column. */
    fullWidth?: boolean;
}

/** While rows are selected, the send slot becomes "send N selected"; `active` says when. */
export const useInviteBulkSend = ({ tab, bulk, selectedTemplate, submitting, fullWidth }: InviteBulkSendOptions) => {
    const { t } = useTranslation();
    const active = bulk != null && bulk.count > 0;
    // Only a server-declared setup-only selection can use canonical mail without a template.
    const ready = bulk?.requiresTemplate === false || selectedTemplate != null;
    const hintId = `invite-bulk-hint-${tab}`;
    const hint =
        active && !ready && !submitting ? (
            <div className={styles.sendHintRow}>
                <p className={styles.sendHint} id={hintId} role="status">
                    {t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.')}
                </p>
            </div>
        ) : null;
    const button =
        active && bulk ? (
            <SplitButton
                collapseLabel={t('links.bulk.clearSelection', 'Auswahl aufheben')}
                icon={<SelectAllIcon fontSize="small" />}
                label={String(bulk.count)}
                mainDescribedBy={hint ? hintId : undefined}
                mainDisabled={!ready || submitting}
                title={t('links.bulk.sendSelected', '{{count}} ausgewählte senden', { count: bulk.count })}
                // The counter is a state display, not the page CTA, so it stays secondary when ready.
                fullWidth={fullWidth}
                variant={ready ? 'secondary' : 'outlined'}
                onClick={bulk.onSend}
                onCollapse={bulk.onClear}
            />
        ) : null;
    return { active, button, hint };
};

interface InviteSearchFieldProps {
    query: string;
    onChange: (query: string) => void;
    placeholder?: string;
}

/** The table card's search: a pill that filters as you type (the list is client-side). */
export const InviteSearchField = ({ query, onChange, placeholder }: InviteSearchFieldProps) => {
    const { t } = useTranslation();
    const label = placeholder ?? t('links.inviteProgress.searchPlaceholder', 'Einladungen durchsuchen');
    return (
        <div className={styles.searchField}>
            <SearchIcon aria-hidden className={styles.searchIcon} />
            <input
                aria-label={label}
                className={styles.searchInput}
                placeholder={label}
                type="search"
                value={query}
                onChange={(event) => onChange(event.target.value)}
            />
            {query && (
                <button
                    aria-label={t('links.inviteProgress.searchClear', 'Suche leeren')}
                    className={styles.searchClear}
                    type="button"
                    onClick={() => onChange('')}
                >
                    <CloseIcon aria-hidden />
                </button>
            )}
        </div>
    );
};
