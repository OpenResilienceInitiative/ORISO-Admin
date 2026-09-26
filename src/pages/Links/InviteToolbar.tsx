import type { FocusEvent, ReactNode, Ref } from 'react';
import { DeleteOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Upload, type MenuProps } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { CollapsibleField } from '../../components/CollapsibleField';
import { GlobalSearchBar, GlobalSearchMenu } from '../../components/GlobalSearch';
import { SplitButton } from '../../components/GlobalSearch/SplitButton';
import { TemplateSplitButton } from '../../components/PlaceholderTemplate';
import { parseInviteCsv, type ParseInviteCsvResult } from './csv/parseInviteCsv';
import {
    downloadInviteCsvTemplate,
    inviteCsvColumnsForTab,
    type InviteCsvTemplateLabels,
} from './csv/inviteCsvTemplate';
import { ROLE_LABEL_KEYS, type InviteSendMode } from './inviteModel';
import type { InviteTab } from './inviteRules';
import styles from './inviteComposer.module.scss';

export interface InviteSearchProps {
    query: string;
    onChange: (query: string) => void;
    placeholder?: string;
}

export interface InviteCsvProps {
    /** Parsed in the browser; the file is never uploaded. */
    onParsed: (result: ParseInviteCsvResult, sendMode: InviteSendMode) => void;
    /** Shows the CSV entries disabled with this reason instead of hiding them. */
    blockedReason?: string;
}

export interface InviteBulkProps {
    count: number;
    onSend: () => void;
    onClear: () => void;
    /** Opens the revoke confirmation; there is no hard delete. */
    onDeleteSelected: () => void;
}

export interface InviteTemplatesProps {
    list: InviteEmailTemplateDTO[];
    selectedId?: number;
    onSelect?: (templateId: number) => void;
    /** Opens the templates dialog; `list` is the picker. */
    onManage: (intent: 'create' | 'delete' | 'list') => void;
    onCreateFrom?: (templateId: number) => void;
}

interface InviteToolbarProps {
    tab: InviteTab;
    search?: InviteSearchProps;
    csv?: InviteCsvProps;
    bulk?: InviteBulkProps;
    templates: InviteTemplatesProps;
    /** The template pill folds like a bar field; the bar owns its collapse state. */
    templatePill: { collapsed: boolean; onExpand: () => void; onPicked: () => void };
    /** The send mode the CSV import captures and whether a template is chosen for it. */
    sendMode: InviteSendMode;
    submitting: boolean;
    /** The bar's fields; the single-invite send button; the hint below the row. */
    children: ReactNode;
    send: ReactNode;
    hint: ReactNode;
    rootRef?: Ref<HTMLDivElement>;
    onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
    className?: string;
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

/** The row around the bar: more-menu (CSV, delete), search, template pill, send or bulk send, hint. */
export const InviteToolbar = ({
    tab,
    search,
    csv,
    bulk,
    templates,
    templatePill,
    sendMode,
    submitting,
    children,
    send,
    hint,
    rootRef,
    onFocus,
    className,
}: InviteToolbarProps) => {
    const { t } = useTranslation();
    const activeTemplates = templates.list.filter((template) => template.active);
    const selectedTemplate = activeTemplates.find((template) => template.id === templates.selectedId);
    const bulkMode = bulk != null && bulk.count > 0;
    // Resending always mails, so bulk send needs a template whatever the send mode.
    const bulkReady = selectedTemplate != null;

    const handleCsvFile = async (file: File) => {
        // Direct mode needs a template, or the batch would silently create without sending.
        if (sendMode === 'direct' && selectedTemplate == null) {
            message.error(t('links.accountInvites.templateRequired', 'Bitte zuerst ein Template auswählen.'));
            return Upload.LIST_IGNORE;
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
        return Upload.LIST_IGNORE;
    };

    // The id column is the Träger-ID on the Träger tab and the agency id elsewhere.
    const csvIdLabel =
        tab === 'tenant'
            ? t('links.accountInvites.tenantId', 'Träger-ID')
            : t('links.accountInvites.agencyId', 'Beratungsstellen-ID');
    const csvTargetLabel = t('links.csvImport.col.target', 'Ziel');

    // One label set per tab for the menu hint and the template header, so the two cannot drift apart.
    const allCsvLabels: Required<InviteCsvTemplateLabels> = {
        email: t('links.accountInvites.email', 'E-Mail'),
        firstName: t('links.accountInvites.firstName', 'Vorname'),
        lastName: t('links.composer.lastName', 'Name'),
        id: csvIdLabel,
        target: csvTargetLabel,
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
            label: csvBlocked ? (
                csvLabel(csv.blockedReason as string)
            ) : (
                <Upload accept=".csv,text/csv" beforeUpload={handleCsvFile} showUploadList={false}>
                    {/* The import expects a fixed column order, and this menu is the only place to learn it. */}
                    {csvLabel(
                        t('links.csvImport.columns', 'Spalten: {{columns}}', {
                            columns: Object.values({
                                ...csvColumns,
                                id: `${csvIdLabel} ${t('links.csvImport.optional', '(optional)')}`,
                            }).join(', '),
                        }),
                    )}
                </Upload>
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
        onClick: ({ key }) => {
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

    const moreButton =
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

    const bulkHintId = `invite-bulk-hint-${tab}`;
    const bulkHint =
        bulkMode && !bulkReady && !submitting ? (
            <div className={styles.sendHintRow}>
                <p className={styles.sendHint} id={bulkHintId} role="status">
                    {t('links.composer.blocked.template', 'Bitte zuerst eine E-Mail-Vorlage auswählen.')}
                </p>
            </div>
        ) : null;

    return (
        <div ref={rootRef} className={classNames(styles.composer, className)} onFocus={onFocus}>
            <GlobalSearchBar
                leading={moreButton}
                searchPlaceholder={search?.placeholder}
                // Enter resolves to the same handler: the list already filters as you type.
                value={search ? search.query : undefined}
                onSearch={search?.onChange}
                onSearchChange={search?.onChange}
            >
                {children}
                <CollapsibleField
                    collapsed={templatePill.collapsed}
                    fieldKey="template"
                    label={t('links.composer.template', 'Vorlage')}
                    pillText={selectedTemplate?.name}
                    valueSummary={selectedTemplate?.name}
                    onExpand={templatePill.onExpand}
                >
                    <TemplateSplitButton
                        activeTemplateId={selectedTemplate?.id}
                        templates={activeTemplates}
                        onCreateFromTemplate={
                            templates.onCreateFrom &&
                            ((id) => templates.onCreateFrom?.(typeof id === 'number' ? id : Number(id)))
                        }
                        onMainClick={() => templates.onManage('list')}
                        onSelectTemplate={(id) => {
                            templates.onSelect?.(typeof id === 'number' ? id : Number(id));
                            templatePill.onPicked();
                        }}
                        // Match the row's 56px SplitButtons; the chooser defaults to the legal editors' 40px pill.
                        size="medium"
                    />
                </CollapsibleField>
                {/* A blur on mousedown would collapse the edited field and slide the button away before mouseup. */}
                <span className={styles.sendSlot} onMouseDownCapture={(event) => event.preventDefault()}>
                    {bulkMode ? (
                        <SplitButton
                            collapseLabel={t('links.bulk.clearSelection', 'Auswahl aufheben')}
                            icon={<SelectAllIcon fontSize="small" />}
                            label={String(bulk.count)}
                            mainDescribedBy={bulkHint ? bulkHintId : undefined}
                            mainDisabled={!bulkReady || submitting}
                            title={t('links.bulk.sendSelected', '{{count}} ausgewählte senden', { count: bulk.count })}
                            // The counter is a state display, not the page CTA, so it stays secondary when ready.
                            variant={bulkReady ? 'secondary' : 'outlined'}
                            onClick={bulk.onSend}
                            onCollapse={bulk.onClear}
                        />
                    ) : (
                        send
                    )}
                </span>
            </GlobalSearchBar>
            {bulkMode ? bulkHint : hint}
        </div>
    );
};
