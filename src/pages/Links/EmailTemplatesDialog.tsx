import { Alert, Button, Input, message, Select, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import {
    createInviteEmailTemplate,
    deleteInviteEmailTemplate,
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
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { canEditSharedTemplates, resolveVisibleTemplateKinds } from '../../constants/linksAccess';
import { LANGUAGE_OPTIONS } from '../../utils/language';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { M3Tooltip } from '../../components/M3Tooltip';
import { Modal, DialogButton } from '../../components/Modal';
import styles from './EmailTemplatesDialog.module.scss';

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
    /** A deletion invalidates a choice; it must never be treated as a saved template. */
    onDeleted?: (id: number) => void;
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

const isPhone = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 599px)').matches;

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
    onDeleted,
    onSelect,
    selectedTemplateId,
}: EmailTemplatesDialogProps) => {
    const { t } = useTranslation();
    const fieldId = useId();
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [loading, setLoading] = useState(false);
    /** Set once the first template request settled — success, empty or failure alike. */
    const [loadCompleted, setLoadCompleted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'list' | 'form'>('list');
    const { isSuperAdmin, hasRole, tenantId: activeTenantId } = useUserRoles();
    // The server owns tenant visibility and per-row edit rights. The kind list
    // additionally limits this surface to the invitation roles the caller uses.
    const visibleKindsKey = resolveVisibleTemplateKinds({ isSuperAdmin, hasRole }).join(',');
    // Keyed on the joined list: `hasRole` is a fresh function every render, and an
    // unstable array here would refire the template request on every render.
    const visibleKinds = useMemo(
        () => (visibleKindsKey ? (visibleKindsKey.split(',') as InviteEmailTemplateKind[]) : []),
        [visibleKindsKey],
    );
    const canEdit = canEditSharedTemplates({ isSuperAdmin, hasRole });
    const sharedTemplateLockReason = t(
        'links.templates.platformAdminOnly',
        'Nur Plattform-Admins können geteilte Vorlagen ändern',
    );
    const noPermissionLockReason = t(
        'links.templates.noPermission',
        'Sie haben keine Berechtigung, diese Vorlage zu ändern',
    );
    // `editable: false` alone does not say why; only an unowned row is the platform's shared one.
    const lockReasonFor = useCallback(
        (template: InviteEmailTemplateDTO) => {
            if (template.systemDefault)
                return t(
                    'links.templates.systemTemplateProtected',
                    'System templates can only be copied into a new template.',
                );
            if (template.tenantId == null && !isSuperAdmin) return sharedTemplateLockReason;
            return noPermissionLockReason;
        },
        [isSuperAdmin, noPermissionLockReason, sharedTemplateLockReason, t],
    );
    // The server answers per row; the role rule covers a server without `editable`.
    const mayEditTemplate = useCallback((template: InviteEmailTemplateDTO) => template.editable ?? canEdit, [canEdit]);
    const mayDeleteTemplate = useCallback(
        (template: InviteEmailTemplateDTO) => !template.systemDefault && mayEditTemplate(template),
        [mayEditTemplate],
    );
    const deleteLockReasonFor = useCallback(
        (template: InviteEmailTemplateDTO) => {
            if (template.systemDefault)
                return t('links.templates.systemDeleteProtected', 'System templates cannot be deleted.');
            return lockReasonFor(template);
        },
        [lockReasonFor, t],
    );
    // Preview uses the current account's design. Branding follows tenant settings automatically.
    const previewTenantId = !isSuperAdmin && activeTenantId && activeTenantId > 0 ? activeTenantId : undefined;

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
    const [overwritePrompt, setOverwritePrompt] = useState(false);
    const [deletePrompt, setDeletePrompt] = useState<InviteEmailTemplateDTO | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(false);

    const kindLabel = useCallback((kind: InviteEmailTemplateKind) => t(`links.templates.kind.${kind}`, kind), [t]);

    // One call per kind the admin may see: the shared API function is typed around a
    // required kind, and the merged list is grouped with the current kind first.
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.all(visibleKinds.map((kind) => listInviteEmailTemplates(kind)));
            setTemplates(results.flat());
        } catch {
            message.error(t('links.templates.loadFailed', 'Could not load templates'));
        } finally {
            setLoading(false);
            // "The request finished", independent of what (or whether) it returned:
            // `templates.length` cannot express a successful empty load or a failed
            // one, and the create deep link must open in both cases.
            setLoadCompleted(true);
        }
    }, [t, visibleKinds]);

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
        } else if (loadCompleted) {
            // The referenced template no longer exists (or the load returned
            // nothing / failed) — a blank create form is still better than
            // silently staying on the list the caller did not ask for.
            createDeepLinkDone.current = true;
            openCreateForm();
        }
    }, [initialView, initialTemplateId, templates, loadCompleted, openCreateForm, openCreateFromTemplate]);

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

    /** Answers the discard question with "keep editing": drops the parked intent, keeps the draft. */
    const cancelDiscardPrompt = useCallback(() => setDiscardPrompt(null), []);

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

    const persistDraft = useCallback(async () => {
        if (!draftComplete || submitting) {
            return;
        }
        setOverwritePrompt(false);
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
            if (!editingTemplate && isSelectable(saved)) {
                onSelect?.(saved);
                return;
            }
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
    }, [
        backToList,
        draftComplete,
        draftMeta,
        draftValues,
        editingTemplate,
        isSelectable,
        loadTemplates,
        onChanged,
        onSelect,
        submitting,
        t,
    ]);

    const onSave = () => {
        if (!draftComplete || submitting) return;
        if (editingTemplate) setOverwritePrompt(true);
        else persistDraft();
    };

    const loadExistingTemplate = (id: string) => {
        const template = kindTemplates.find((entry) => String(entry.id) === id);
        if (!template) return;
        guardDraft(() => {
            if (mayEditTemplate(template)) openEditForm(template);
            else {
                openCreateFromTemplate(template);
                // Protected sources can be loaded, but are saved as a new owned copy.
                setDraftMeta((meta) => ({ ...meta, name: template.name }));
                if (draftBaselineRef.current) draftBaselineRef.current.name = template.name;
            }
        });
    };

    const confirmDelete = async () => {
        if (!deletePrompt || deleting || !mayDeleteTemplate(deletePrompt)) return;
        setDeleting(true);
        setDeleteError(false);
        try {
            await deleteInviteEmailTemplate(deletePrompt.id);
            setTemplates((current) => current.filter((template) => template.id !== deletePrompt.id));
            onDeleted?.(deletePrompt.id);
            setDeletePrompt(null);
            message.success(t('links.templates.deleted', 'Template deleted'));
            await loadTemplates();
        } catch {
            setDeleteError(true);
        } finally {
            setDeleting(false);
        }
    };

    const renderName = useCallback(
        (value: string, template: InviteEmailTemplateDTO) => {
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
        [isSelectable, onSelect, selectedTemplateId, t],
    );

    const columns = useMemo(
        () => [
            {
                title: t('links.templates.col.kind', 'Kind'),
                dataIndex: 'kind',
                key: 'kind',
                className: styles.hideOnPhone,
                render: (value: InviteEmailTemplateKind) => kindLabel(value),
            },
            {
                title: t('links.templates.col.name', 'Name'),
                dataIndex: 'name',
                key: 'name',
                render: (value: string, template: InviteEmailTemplateDTO) => (
                    <span className={styles.nameStack}>
                        {renderName(value, template)}
                        {/* The Kind column is hidden on phones; this line keeps the information (#1127). */}
                        <span className={styles.kindLine} data-testid="template-kind-line">
                            {kindLabel(template.kind)}
                        </span>
                    </span>
                ),
            },
            {
                title: t('links.templates.col.language', 'Language'),
                dataIndex: 'language',
                key: 'language',
                className: styles.hideOnPhone,
                render: (value: string | null) => value || '—',
            },
            {
                title: t('links.templates.col.subject', 'Subject'),
                dataIndex: 'subject',
                key: 'subject',
                className: styles.hideOnPhone,
            },
            {
                title: t('links.templates.col.actions', 'Actions'),
                key: 'actions',
                render: (_: unknown, template: InviteEmailTemplateDTO) => (
                    <div className={listingTableStyles.actionGroup}>
                        {mayEditTemplate(template) ? (
                            <Button size="small" onClick={() => openEditForm(template)}>
                                {t('links.templates.edit', 'Edit')}
                            </Button>
                        ) : (
                            // Portal: the table body scrolls and would clip the bubble on the first and last row.
                            <M3Tooltip text={lockReasonFor(template)} portal>
                                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger around a disabled button */}
                                <span tabIndex={0}>
                                    <Button disabled size="small">
                                        {t('links.templates.edit', 'Edit')}
                                    </Button>
                                </span>
                            </M3Tooltip>
                        )}
                        <M3Tooltip
                            text={mayDeleteTemplate(template) ? undefined : deleteLockReasonFor(template)}
                            portal
                        >
                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger around a disabled button */}
                            <span tabIndex={mayDeleteTemplate(template) ? undefined : 0}>
                                <Button
                                    danger
                                    disabled={!mayDeleteTemplate(template)}
                                    size="small"
                                    onClick={() => {
                                        setDeleteError(false);
                                        setDeletePrompt(template);
                                    }}
                                >
                                    {t('links.templates.delete', 'Delete')}
                                </Button>
                            </span>
                        </M3Tooltip>
                    </div>
                ),
            },
        ],
        [
            kindLabel,
            lockReasonFor,
            mayEditTemplate,
            mayDeleteTemplate,
            deleteLockReasonFor,
            openEditForm,
            renderName,
            t,
        ],
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
            <DialogButton
                // The form wrapper goes `inert` with the prompt, which drops the
                // previously focused control out of the focus path — without this
                // the browser blurs to <body> and keyboard users land outside the
                // dialog. Focus the SAFE action, never the destructive one.
                ref={(button: HTMLButtonElement | null) => button?.focus()}
                onClick={cancelDiscardPrompt}
            >
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

    const editorFooter = (
        <footer className={styles.editorFooter} data-testid="template-editor-footer">
            <div>
                <div className={styles.footerFields}>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-load-template`}>
                            {t('links.templates.existingTemplates', 'Existing templates')}
                        </label>
                        <Select
                            id={`${fieldId}-load-template`}
                            placeholder={t('links.templates.loadTemplate', 'Load template')}
                            value={editingTemplate ? String(editingTemplate.id) : undefined}
                            options={kindTemplates.map((entry) => ({ value: String(entry.id), label: entry.name }))}
                            onChange={loadExistingTemplate}
                            showSearch
                            optionFilterProp="label"
                            disabled={submitting}
                        />
                    </div>
                    <div className={styles.metaField}>
                        <label className={styles.metaLabel} htmlFor={`${fieldId}-name`}>
                            {t('links.templates.field.name', 'Vorlagenname')}
                        </label>
                        <Input
                            id={`${fieldId}-name`}
                            value={draftMeta.name}
                            disabled={submitting}
                            onChange={(event) => setDraftMeta((meta) => ({ ...meta, name: event.target.value }))}
                        />
                    </div>
                </div>
                {!draftComplete && (
                    <p className={styles.saveHint} id={saveHintId} role="status">
                        {t(
                            'links.templates.saveIncomplete',
                            'Vorlagenname, Betreff und Inhalt ausfüllen, um zu speichern.',
                        )}
                    </p>
                )}
            </div>
            <div className={styles.footerActions}>
                <DialogButton disabled={submitting} onClick={() => guardDraft(backToList)}>
                    {t('cancel')}
                </DialogButton>
                <DialogButton
                    primary
                    disabled={submitting || !draftComplete}
                    aria-describedby={draftComplete ? undefined : saveHintId}
                    onClick={onSave}
                >
                    {t('save')}
                </DialogButton>
            </div>
        </footer>
    );
    const overwriteFooter = (
        <div className={styles.footerActions}>
            <DialogButton
                ref={(button: HTMLButtonElement | null) => button?.focus()}
                onClick={() => setOverwritePrompt(false)}
            >
                {t('links.templates.overwriteCancel', 'Abbrechen')}
            </DialogButton>
            <DialogButton primary onClick={persistDraft}>
                {t('links.templates.overwriteConfirm', 'Überschreiben')}
            </DialogButton>
        </div>
    );

    if (view === 'form') {
        const formTitleKey = editingTemplate ? 'links.templates.editTitle' : 'links.templates.newTitle';
        const formDescriptionKey = editingTemplate
            ? 'links.templates.editDescription'
            : 'links.templates.newDescription';

        let titleKey = formTitleKey;
        let descriptionKey = formDescriptionKey;
        if (discardPrompt) {
            titleKey = 'links.templates.discardTitle';
            descriptionKey = 'links.templates.discardDescription';
        } else if (overwritePrompt) {
            titleKey = 'links.templates.overwriteTitle';
            descriptionKey = 'links.templates.overwriteDescription';
        }
        const closeForm = (intent: () => void) => {
            if (submitting) return;
            if (overwritePrompt) setOverwritePrompt(false);
            else if (discardPrompt) cancelDiscardPrompt();
            else guardDraft(intent);
        };
        return (
            <PlaceholderTemplateDialog
                icon={<DescriptionOutlinedIcon data-testid="template-header-icon" />}
                titleKey={titleKey}
                descriptionKey={descriptionKey}
                scrollableBody
                footer={discardFooter ?? (overwritePrompt ? overwriteFooter : editorFooter)}
                saveDisabled={submitting || !draftComplete}
                saveDescribedBy={draftComplete ? undefined : saveHintId}
                width={1180}
                // Abbrechen steps back to the list; X/Escape/mask keep closing
                // the whole dialog, as they did before the module wiring. Both
                // ask first when the draft carries unsaved edits — and while the
                // question is up, either gesture answers it with "Abbrechen"
                // instead of parking a second intent over the pending one.
                onClose={() => closeForm(backToList)}
                onDismiss={() => closeForm(onClose)}
                onSave={onSave}
            >
                {overwritePrompt && <p className={styles.discardBody}>{editingTemplate?.name}</p>}
                {discardPrompt && (
                    <p className={styles.discardBody} role="status">
                        {t('links.templates.discardBody', 'Diese Vorlage wurde geändert, aber noch nicht gespeichert.')}
                    </p>
                )}
                {/* While the discard question is up, the form stays MOUNTED but
                    hidden and inert: the draft, the caret and the preview frame
                    survive an "Abbrechen" untouched. */}
                <div
                    className={discardPrompt || overwritePrompt ? styles.formHidden : undefined}
                    inert={discardPrompt != null || overwritePrompt}
                >
                    {/* Persistence metadata around the editor: what the API stores per
                        template beyond subject/body. The editor below owns the tokenised
                        content and the live preview. */}
                    <div className={styles.metaFields}>
                        <div className={styles.metaField}>
                            <label className={styles.metaLabel} htmlFor={`${fieldId}-kind`}>
                                {t('links.templates.field.kind', 'Template for')}
                            </label>
                            <Select
                                id={`${fieldId}-kind`}
                                disabled={submitting || editingTemplate?.systemDefault === true}
                                options={visibleKinds.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
                                value={draftMeta.kind}
                                onChange={(kind: InviteEmailTemplateKind) =>
                                    setDraftMeta((meta) => ({ ...meta, kind }))
                                }
                            />
                        </div>
                        <div className={styles.metaField}>
                            <label className={styles.metaLabel} htmlFor={`${fieldId}-language`}>
                                {t('links.templates.field.language', 'Language')}
                            </label>
                            <Select
                                id={`${fieldId}-language`}
                                disabled={submitting || editingTemplate?.systemDefault === true}
                                value={draftMeta.language}
                                options={[
                                    { value: '', label: t('links.templates.languageAutomatic', 'Automatic') },
                                    ...LANGUAGE_OPTIONS.filter((option) => option.value !== 'de@informal').map(
                                        (option) => ({ value: option.value, label: t(option.labelKey) }),
                                    ),
                                    ...(draftMeta.language &&
                                    !LANGUAGE_OPTIONS.some(
                                        (option) =>
                                            option.value !== 'de@informal' && option.value === draftMeta.language,
                                    )
                                        ? [
                                              {
                                                  value: draftMeta.language,
                                                  label:
                                                      draftMeta.language === 'de@informal'
                                                          ? t('language.options.de@informal')
                                                          : draftMeta.language,
                                              },
                                          ]
                                        : []),
                                ]}
                                onChange={(language: string) => setDraftMeta((meta) => ({ ...meta, language }))}
                            />
                        </div>
                    </div>
                    <InviteEmailTemplateEditor
                        hideTemplateChooser
                        tenantId={previewTenantId}
                        activeTemplateId={editingTemplate?.id}
                        // The preview follows the template's own language, not the admin UI locale.
                        language={draftMeta.language}
                        // E2: the preview is rendered by the backend's own mail renderer;
                        // the kind selects the sample content it renders with.
                        kind={draftMeta.kind}
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
                                // Picking a template opens it for editing, and save writes it back.
                                // Without the right to edit shared templates, the pick starts a new
                                // template from it instead, as "Neu aus …" does.
                                guardDraft(() =>
                                    mayEditTemplate(template)
                                        ? openEditForm(template)
                                        : openCreateFromTemplate(template),
                                );
                            }
                        }}
                    />
                </div>
            </PlaceholderTemplateDialog>
        );
    }

    /* --------------------------------------------------------------------- */
    /* List view                                                             */
    /* --------------------------------------------------------------------- */

    let listDescriptionKey = onSelect ? 'links.templates.pickHint' : 'links.templates.dialogDescription';
    if (deletePrompt) listDescriptionKey = 'links.templates.deleteDescription';

    return (
        <Modal
            scrollableBody
            titleKey={deletePrompt ? 'links.templates.deleteTitle' : 'links.templates.dialogTitle'}
            descriptionKey={listDescriptionKey}
            icon={<EmailOutlinedIcon />}
            onClose={() => {
                if (!deleting) {
                    if (deletePrompt) setDeletePrompt(null);
                    else onClose();
                }
            }}
            footer={
                deletePrompt ? (
                    <div className={styles.footerActions}>
                        <DialogButton
                            disabled={deleting}
                            ref={(button: HTMLButtonElement | null) => button?.focus()}
                            onClick={() => setDeletePrompt(null)}
                        >
                            {t('links.templates.overwriteCancel', 'Abbrechen')}
                        </DialogButton>
                        <DialogButton disabled={deleting} destructive onClick={confirmDelete}>
                            {t('links.templates.delete', 'Delete')}
                        </DialogButton>
                    </div>
                ) : (
                    listFooter
                )
            }
            width={1180}
        >
            {deletePrompt && (
                <div role="status">
                    <p>{deletePrompt.name}</p>
                    {deleteError && (
                        <Alert
                            type="error"
                            message={t(
                                'links.templates.deleteFailed',
                                'Could not delete template. It may still be used by queued invitations.',
                            )}
                        />
                    )}
                </div>
            )}
            <div className={deletePrompt ? styles.formHidden : undefined} inert={deletePrompt != null}>
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
                        onClick: (event: MouseEvent<HTMLElement>) => {
                            if ((event.target as HTMLElement).closest('button')) return;
                            if (isSelectable(template)) {
                                onSelect?.(template);
                            } else if (!onSelect && mayEditTemplate(template) && isPhone()) {
                                // No double-click on a touch screen (a double tap zooms): one tap edits (#1127).
                                openEditForm(template);
                            }
                        },
                        // Manager-only mode: without picking, a row click is free
                        // for the edit shortcut — for whoever may edit at all.
                        onDoubleClick:
                            onSelect || !mayEditTemplate(template) ? undefined : () => openEditForm(template),
                    })}
                />
            </div>
        </Modal>
    );
};
