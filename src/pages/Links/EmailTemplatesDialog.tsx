import { Button, Input, message, Select, Switch, Tag, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import {
    createInviteEmailTemplate,
    InviteEmailTemplateDTO,
    InviteEmailTemplateKind,
    listInviteEmailTemplates,
    TemplateRequestDTO,
    updateInviteEmailTemplate,
} from '../../api/accountInvites/accountInvites';
import {
    InviteEmailTemplateEditor,
    inviteEmailTokensForKind,
    PlaceholderTemplateDialog,
    type InviteEmailTemplateValues,
    type PlaceholderTemplateDefinition,
} from '../../components/PlaceholderTemplate';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { Modal, DialogButton } from '../../components/Modal';
import styles from './EmailTemplatesDialog.module.scss';

const TEMPLATE_KINDS: InviteEmailTemplateKind[] = ['TENANT_INVITE', 'COUNSELLOR_INVITE', 'DPA_FORWARD'];

interface EmailTemplatesDialogProps {
    /** The template kind of the invite tab the dialog was opened from — used to preset new templates. */
    templateKind: InviteEmailTemplateKind;
    /**
     * `'create'` opens directly in the create form (invite composer's
     * "Neue E-Mail-Vorlage erstellen"); default is the template list.
     */
    initialView?: 'list' | 'create';
    onClose: () => void;
    /** Fired after any successful create/update so the opener can refetch its template select. */
    onChanged?: (template: InviteEmailTemplateDTO) => void;
    /**
     * Picker mode: passing `onSelect` turns the overview list into the way
     * of choosing a template — clicking a row's name hands it back to the opener,
     * which keeps owning the selection (the composer pill reopens this dialog).
     * Without it the dialog stays a pure manager (double-click a row to edit).
     */
    onSelect?: (template: InviteEmailTemplateDTO) => void;
    /** Template currently chosen in the composer — marked in the list. */
    selectedTemplateId?: number;
}

/** The editable state of the create/edit form, next to the editor's subject/body values. */
interface TemplateDraftMeta {
    kind: InviteEmailTemplateKind;
    name: string;
    language: string;
    active: boolean;
}

const emptyValues: InviteEmailTemplateValues = { subject: '', body: '' };

/**
 * Manage-templates dialog opened from the invite tabs' template select. Two views:
 * the template list (house list Modal) and the create/edit form, which is the
 * placeholder-template module (#746) — `PlaceholderTemplateDialog` wrapping
 * `InviteEmailTemplateEditor` with per-kind token pickers, the template split
 * button and the live e-mail-kit preview. Deliberately NOT a separate admin
 * section — templates are only ever needed right where invites are sent.
 *
 * With `onSelect` the list doubles as a picker: clicking a template's name selects
 * it for the composer. Editing then only happens through the row's "Bearbeiten"
 * button — double-click-to-edit stays for the manager-only mode, where no click
 * means "choose".
 */
export const EmailTemplatesDialog = ({
    templateKind,
    initialView = 'list',
    onClose,
    onChanged,
    onSelect,
    selectedTemplateId,
}: EmailTemplatesDialogProps) => {
    const { t } = useTranslation();
    const fieldId = useId();
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingTemplate, setEditingTemplate] = useState<InviteEmailTemplateDTO | null>(null);
    const [draftMeta, setDraftMeta] = useState<TemplateDraftMeta>({
        kind: templateKind,
        name: '',
        language: '',
        active: true,
    });
    const [draftValues, setDraftValues] = useState<InviteEmailTemplateValues>(emptyValues);

    const kindLabel = useCallback((kind: InviteEmailTemplateKind) => t(`links.templates.kind.${kind}`, kind), [t]);

    // One call per kind: the shared API function is typed around a required kind and
    // the merged list keeps every template visible (grouped table, current kind first).
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.all(TEMPLATE_KINDS.map((kind) => listInviteEmailTemplates(kind)));
            setTemplates(results.flat());
        } catch {
            message.error(t('links.templates.loadFailed', 'Could not load templates'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const sortedTemplates = useMemo(
        () =>
            [...templates].sort((a, b) =>
                a.kind === b.kind
                    ? a.name.localeCompare(b.name)
                    : (a.kind === templateKind ? -1 : 1) - (b.kind === templateKind ? -1 : 1),
            ),
        [templates, templateKind],
    );

    const openCreateForm = useCallback(() => {
        setEditingTemplate(null);
        setDraftMeta({ kind: templateKind, name: '', language: '', active: true });
        setDraftValues(emptyValues);
        setView('form');
    }, [templateKind]);

    // Deep link from the invite composer ("Neue E-Mail-Vorlage erstellen"): open
    // straight in the create form instead of the list.
    useEffect(() => {
        if (initialView === 'create') {
            openCreateForm();
        }
    }, [initialView, openCreateForm]);

    const openEditForm = useCallback((template: InviteEmailTemplateDTO) => {
        setEditingTemplate(template);
        setDraftMeta({
            kind: template.kind,
            name: template.name,
            language: template.language ?? '',
            active: template.active,
        });
        setDraftValues({ subject: template.subject, body: template.body });
        setView('form');
    }, []);

    // "Neu aus …" (split-button menu): a NEW template that starts from an existing
    // one's contents. The empty name is what marks it as new — the admin has to
    // name it before save enables.
    const openCreateFromTemplate = useCallback((template: InviteEmailTemplateDTO) => {
        setEditingTemplate(null);
        setDraftMeta({ kind: template.kind, name: '', language: template.language ?? '', active: true });
        setDraftValues({ subject: template.subject, body: template.body });
        setView('form');
    }, []);

    // The composer only offers active templates of its own tab's kind, so those are the
    // only rows that can be picked — selecting anything else would put a name on the
    // split button that the send call cannot use.
    const isSelectable = useCallback(
        (template: InviteEmailTemplateDTO) => onSelect != null && template.active && template.kind === templateKind,
        [onSelect, templateKind],
    );

    const backToList = useCallback(() => {
        setEditingTemplate(null);
        setDraftValues(emptyValues);
        setView('list');
    }, []);

    // Templates of the draft's kind feed the editor's split button: switching
    // loads a stored template, "Neu aus" starts a fresh one from it.
    const kindTemplates = useMemo(
        () =>
            templates
                .filter((template) => template.kind === draftMeta.kind)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [templates, draftMeta.kind],
    );

    const editorTemplates = useMemo<PlaceholderTemplateDefinition<InviteEmailTemplateValues>[]>(
        () =>
            kindTemplates.map((template) => ({
                id: template.id,
                name: template.name,
                values: { subject: template.subject, body: template.body },
            })),
        [kindTemplates],
    );

    const draftComplete =
        draftMeta.name.trim().length > 0 && draftValues.subject.trim().length > 0 && draftValues.body.trim().length > 0;

    const onSave = useCallback(async () => {
        if (!draftComplete || submitting) {
            return;
        }
        setSubmitting(true);
        // Same payload contract as the pre-module form: subject/body verbatim,
        // language normalised to null when blank.
        const payload: TemplateRequestDTO = {
            kind: draftMeta.kind,
            name: draftMeta.name.trim(),
            language: draftMeta.language.trim() || null,
            subject: draftValues.subject,
            body: draftValues.body,
            active: draftMeta.active,
        };
        try {
            let saved: InviteEmailTemplateDTO;
            if (editingTemplate) {
                saved = await updateInviteEmailTemplate(editingTemplate.id, payload);
                message.success(t('links.templates.updated', 'Template updated'));
            } else {
                saved = await createInviteEmailTemplate(payload);
                message.success(t('links.templates.created', 'Template created'));
            }
            onChanged?.(saved);
            backToList();
            await loadTemplates();
        } catch {
            message.error(
                editingTemplate
                    ? t('links.templates.updateFailed', 'Could not update template')
                    : t('links.templates.createFailed', 'Could not create template'),
            );
        } finally {
            setSubmitting(false);
        }
    }, [backToList, draftComplete, draftMeta, draftValues, editingTemplate, loadTemplates, onChanged, submitting, t]);

    const columns = useMemo(
        () => [
            {
                title: t('links.templates.col.kind', 'Kind'),
                dataIndex: 'kind',
                key: 'kind',
                render: (value: InviteEmailTemplateKind) => kindLabel(value),
            },
            {
                title: t('links.templates.col.name', 'Name'),
                dataIndex: 'name',
                key: 'name',
                render: (value: string, template: InviteEmailTemplateDTO) => {
                    const selected = template.id === selectedTemplateId;
                    const mark = selected ? (
                        <CheckRoundedIcon className={styles.selectedMark} fontSize="small" aria-hidden />
                    ) : null;

                    if (!isSelectable(template)) {
                        return (
                            <Tooltip
                                title={
                                    onSelect
                                        ? t(
                                              'links.templates.notSelectable',
                                              'Nur aktive Vorlagen dieser Art können ausgewählt werden.',
                                          )
                                        : undefined
                                }
                            >
                                <span className={styles.templateName}>
                                    {mark}
                                    {value}
                                </span>
                            </Tooltip>
                        );
                    }

                    return (
                        <button
                            aria-current={selected ? 'true' : undefined}
                            className={classNames(styles.templateName, styles.selectButton, {
                                [styles.selectedName]: selected,
                            })}
                            type="button"
                            onClick={() => onSelect?.(template)}
                        >
                            {mark}
                            {value}
                        </button>
                    );
                },
            },
            {
                title: t('links.templates.col.language', 'Language'),
                dataIndex: 'language',
                key: 'language',
                render: (value: string | null) => value || '—',
            },
            {
                title: t('links.templates.col.subject', 'Subject'),
                dataIndex: 'subject',
                key: 'subject',
            },
            {
                title: t('links.templates.col.active', 'Active'),
                dataIndex: 'active',
                key: 'active',
                render: (value: boolean) => (
                    <Tag color={value ? 'green' : 'default'}>
                        {value ? t('links.templates.activeYes', 'Active') : t('links.templates.activeNo', 'Inactive')}
                    </Tag>
                ),
            },
            {
                title: t('links.templates.col.actions', 'Actions'),
                key: 'actions',
                render: (_: unknown, template: InviteEmailTemplateDTO) => (
                    <div className={listingTableStyles.actionGroup}>
                        <Button size="small" onClick={() => openEditForm(template)}>
                            {t('links.templates.edit', 'Edit')}
                        </Button>
                        {/* The backend exposes no DELETE for invite-email-templates yet
                            (AccountInviteController: POST/PUT/GET only), so per #314 the
                            delete action ships disabled with an explanatory tooltip
                            instead of inventing an endpoint. */}
                        <Tooltip title={t('links.templates.deleteUnavailable', 'Backend-Endpoint fehlt (#314)')}>
                            <span>
                                <Button danger disabled size="small">
                                    {t('links.templates.delete', 'Delete')}
                                </Button>
                            </span>
                        </Tooltip>
                    </div>
                ),
            },
        ],
        [isSelectable, kindLabel, onSelect, openEditForm, selectedTemplateId, t],
    );

    const listFooter = (
        <div className={styles.footerActions}>
            <DialogButton onClick={onClose}>{t('links.templates.close', 'Close')}</DialogButton>
            <DialogButton primary onClick={openCreateForm}>
                {t('links.templates.new', 'New template')}
            </DialogButton>
        </div>
    );

    /* --------------------------------------------------------------------- */
    /* Form view: the placeholder-template module in the house dialog shell  */
    /* --------------------------------------------------------------------- */

    if (view === 'form') {
        return (
            <PlaceholderTemplateDialog
                titleKey={editingTemplate ? 'links.templates.editTitle' : 'links.templates.newTitle'}
                descriptionKey={editingTemplate ? 'links.templates.editDescription' : 'links.templates.newDescription'}
                saveDisabled={submitting || !draftComplete}
                width={1180}
                onClose={backToList}
                onSave={onSave}
            >
                {/* Persistence metadata around the editor: what the API stores per
                    template beyond subject/body. The editor below owns the tokenised
                    content and the live preview. */}
                <div className={styles.metaFields}>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-kind`}>
                            {t('links.templates.field.kind', 'Kind')}
                        </label>
                        <Select
                            id={`${fieldId}-kind`}
                            options={TEMPLATE_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
                            value={draftMeta.kind}
                            onChange={(kind: InviteEmailTemplateKind) => setDraftMeta((meta) => ({ ...meta, kind }))}
                        />
                    </div>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-name`}>
                            {t('links.templates.field.name', 'Vorlagenname')}
                        </label>
                        <Input
                            id={`${fieldId}-name`}
                            value={draftMeta.name}
                            onChange={(event) => setDraftMeta((meta) => ({ ...meta, name: event.target.value }))}
                        />
                    </div>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-language`}>
                            {t('links.templates.field.language', 'Language')}
                        </label>
                        <Input
                            id={`${fieldId}-language`}
                            placeholder="de"
                            value={draftMeta.language}
                            onChange={(event) => setDraftMeta((meta) => ({ ...meta, language: event.target.value }))}
                        />
                    </div>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-active`}>
                            {t('links.templates.field.active', 'Active')}
                        </label>
                        <Switch
                            checked={draftMeta.active}
                            id={`${fieldId}-active`}
                            onChange={(active) => setDraftMeta((meta) => ({ ...meta, active }))}
                        />
                    </div>
                </div>
                <InviteEmailTemplateEditor
                    activeTemplateId={editingTemplate?.id}
                    templates={editorTemplates}
                    tokens={inviteEmailTokensForKind(draftMeta.kind)}
                    values={draftValues}
                    onChange={setDraftValues}
                    onCreateFromTemplate={(id) => {
                        const template = kindTemplates.find((entry) => entry.id === id);
                        if (template) {
                            openCreateFromTemplate(template);
                        }
                    }}
                    onManageTemplates={backToList}
                    onSelectTemplate={(id) => {
                        const template = kindTemplates.find((entry) => entry.id === id);
                        if (template) {
                            openEditForm(template);
                        }
                    }}
                />
                {/* #713 house rule: a disabled primary action must say why. */}
                {!draftComplete && (
                    <p className={styles.saveHint} role="status">
                        {t(
                            'links.templates.saveIncomplete',
                            'Vorlagenname, Betreff und Inhalt ausfüllen, um zu speichern.',
                        )}
                    </p>
                )}
            </PlaceholderTemplateDialog>
        );
    }

    /* --------------------------------------------------------------------- */
    /* List view                                                             */
    /* --------------------------------------------------------------------- */

    return (
        <Modal
            titleKey="links.templates.dialogTitle"
            descriptionKey={onSelect ? 'links.templates.pickHint' : 'links.templates.dialogDescription'}
            icon={<EmailOutlinedIcon />}
            onClose={onClose}
            footer={listFooter}
            width={1180}
        >
            <ListingTable
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={sortedTemplates}
                pagination={false}
                scroll={{ y: 'auto' }}
                onRow={(template: InviteEmailTemplateDTO) => ({
                    className: classNames({
                        [styles.pickableRow]: isSelectable(template),
                        [styles.selectedRow]: template.id === selectedTemplateId,
                    }),
                    // The whole row is a hit area for picking, but its own
                    // buttons (name, edit) keep their meaning.
                    onClick: isSelectable(template)
                        ? (event: MouseEvent<HTMLElement>) => {
                              if (!(event.target as HTMLElement).closest('button')) {
                                  onSelect?.(template);
                              }
                          }
                        : undefined,
                    // Manager-only mode: without picking, a row click is free
                    // for the edit shortcut.
                    onDoubleClick: onSelect ? undefined : () => openEditForm(template),
                })}
            />
        </Modal>
    );
};
