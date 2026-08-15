import { Button, Input, message, Select, Switch, Tag, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react';
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
    /**
     * With `initialView='create'`: prefill the new template from this stored
     * one ("Neu aus …" in the composer pill's menu, #746 review). Ignored in
     * list mode.
     */
    initialTemplateId?: number;
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

/** Snapshot of what the form last loaded — the reference for "unsaved edits". */
interface TemplateDraftBaseline extends TemplateDraftMeta {
    subject: string;
    body: string;
}

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
    initialTemplateId,
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
    // What the form last loaded — the reference for "unsaved edits" (#746 review:
    // no menu click or close gesture may silently discard typed content).
    const draftBaselineRef = useRef<TemplateDraftBaseline | null>(null);
    /**
     * Pending navigation waiting for the in-dialog discard confirmation. The
     * state holds the intent itself, so the prompt stays a state of THIS dialog
     * instead of a second overlay (see {@link guardDraft}).
     */
    const [discardPrompt, setDiscardPrompt] = useState<(() => void) | null>(null);

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
        const meta: TemplateDraftMeta = { kind: templateKind, name: '', language: '', active: true };
        setDraftMeta(meta);
        setDraftValues(emptyValues);
        draftBaselineRef.current = { ...meta, ...emptyValues };
        setView('form');
    }, [templateKind]);

    const openEditForm = useCallback((template: InviteEmailTemplateDTO) => {
        setEditingTemplate(template);
        const meta: TemplateDraftMeta = {
            kind: template.kind,
            name: template.name,
            language: template.language ?? '',
            active: template.active,
        };
        const values: InviteEmailTemplateValues = { subject: template.subject, body: template.body };
        setDraftMeta(meta);
        setDraftValues(values);
        draftBaselineRef.current = { ...meta, ...values };
        setView('form');
    }, []);

    // "Neu aus …" (split-button menu): a NEW template that starts from an existing
    // one's contents. The empty name is what marks it as new — the admin has to
    // name it before save enables.
    const openCreateFromTemplate = useCallback((template: InviteEmailTemplateDTO) => {
        setEditingTemplate(null);
        const meta: TemplateDraftMeta = {
            kind: template.kind,
            name: '',
            language: template.language ?? '',
            active: true,
        };
        const values: InviteEmailTemplateValues = { subject: template.subject, body: template.body };
        setDraftMeta(meta);
        setDraftValues(values);
        draftBaselineRef.current = { ...meta, ...values };
        setView('form');
    }, []);

    // Deep link from the invite composer: straight into the create form — blank,
    // or prefilled from `initialTemplateId` ("Neu aus …" in the pill menu). Runs
    // once; the template list may still be loading when the prefill is requested.
    const createDeepLinkDone = useRef(false);
    useEffect(() => {
        if (initialView !== 'create' || createDeepLinkDone.current) {
            return;
        }
        if (initialTemplateId == null) {
            createDeepLinkDone.current = true;
            openCreateForm();
            return;
        }
        const source = templates.find((template) => template.id === initialTemplateId);
        if (source) {
            createDeepLinkDone.current = true;
            openCreateFromTemplate(source);
        } else if (templates.length > 0) {
            // The referenced template no longer exists — a blank create form
            // is still better than silently staying on the list.
            createDeepLinkDone.current = true;
            openCreateForm();
        }
    }, [initialView, initialTemplateId, templates, openCreateForm, openCreateFromTemplate]);

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
        draftBaselineRef.current = null;
        setView('list');
    }, []);

    // #746 review: no template switch, back navigation or close gesture may
    // silently discard typed content.
    const draftDirty = useCallback(() => {
        const baseline = draftBaselineRef.current;
        return (
            baseline != null &&
            (baseline.kind !== draftMeta.kind ||
                baseline.name !== draftMeta.name ||
                baseline.language !== draftMeta.language ||
                baseline.active !== draftMeta.active ||
                baseline.subject !== draftValues.subject ||
                baseline.body !== draftValues.body)
        );
    }, [draftMeta, draftValues]);

    /**
     * Runs `intent` right away on a clean draft; on a dirty one it parks the
     * intent and turns THIS dialog into the discard question. Deliberately not a
     * second overlay: an antd `Modal.confirm` opened from inside a closing Modal
     * is torn down with its parent (the portal-overlay unmount trap), and a
     * native `window.confirm` would break the house M3 dialog anatomy.
     */
    const guardDraft = useCallback(
        (intent: () => void) => {
            if (draftDirty()) {
                setDiscardPrompt(() => intent);
                return;
            }
            intent();
        },
        [draftDirty],
    );

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

    const saveHintId = `${fieldId}-save-hint`;

    /*
     * Discard question as a STATE of the open dialog (M3 house anatomy):
     * title + description become the question, the footer becomes
     * Abbrechen / Verwerfen. One overlay throughout — no portal that could be
     * unmounted with its parent, and no native browser confirm.
     */
    const discardFooter = discardPrompt ? (
        <div className={styles.footerActions}>
            <DialogButton onClick={() => setDiscardPrompt(null)}>
                {t('links.templates.discardCancel', 'Abbrechen')}
            </DialogButton>
            <DialogButton
                destructive
                onClick={() => {
                    const intent = discardPrompt;
                    setDiscardPrompt(null);
                    intent();
                }}
            >
                {t('links.templates.discardConfirm', 'Verwerfen')}
            </DialogButton>
        </div>
    ) : undefined;

    if (view === 'form') {
        const formTitleKey = editingTemplate ? 'links.templates.editTitle' : 'links.templates.newTitle';
        const formDescriptionKey = editingTemplate
            ? 'links.templates.editDescription'
            : 'links.templates.newDescription';

        return (
            <PlaceholderTemplateDialog
                titleKey={discardPrompt ? 'links.templates.discardTitle' : formTitleKey}
                descriptionKey={discardPrompt ? 'links.templates.discardDescription' : formDescriptionKey}
                footer={discardFooter}
                saveDisabled={submitting || !draftComplete}
                saveDescribedBy={draftComplete ? undefined : saveHintId}
                width={1180}
                // Abbrechen steps back to the list; X/Escape/mask keep closing
                // the whole dialog, as they did before the module wiring. Both
                // ask first when the draft carries unsaved edits.
                onClose={() => guardDraft(backToList)}
                onDismiss={() => guardDraft(onClose)}
                onSave={onSave}
            >
                {discardPrompt && (
                    <p className={styles.discardBody} role="status">
                        {t(
                            'links.templates.discardBody',
                            'Betreff und Inhalt dieser Vorlage wurden geändert, aber noch nicht gespeichert.',
                        )}
                    </p>
                )}
                {/* While the discard question is up, the form stays MOUNTED but
                    hidden and inert: the draft, the caret and the preview frame
                    survive an "Abbrechen" untouched. */}
                <div className={discardPrompt ? styles.formHidden : undefined} inert={discardPrompt != null}>
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
                                onChange={(kind: InviteEmailTemplateKind) =>
                                    setDraftMeta((meta) => ({ ...meta, kind }))
                                }
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
                                onChange={(event) =>
                                    setDraftMeta((meta) => ({ ...meta, language: event.target.value }))
                                }
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
                                guardDraft(() => openCreateFromTemplate(template));
                            }
                        }}
                        onManageTemplates={() => guardDraft(backToList)}
                        onSelectTemplate={(id) => {
                            const template = kindTemplates.find((entry) => entry.id === id);
                            if (template) {
                                guardDraft(() => openEditForm(template));
                            }
                        }}
                    />
                    {/* #713 house rule: a disabled primary action must say why —
                        linked to the save button via aria-describedby. */}
                    {!draftComplete && (
                        <p className={styles.saveHint} id={saveHintId} role="status">
                            {t(
                                'links.templates.saveIncomplete',
                                'Vorlagenname, Betreff und Inhalt ausfüllen, um zu speichern.',
                            )}
                        </p>
                    )}
                </div>
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
