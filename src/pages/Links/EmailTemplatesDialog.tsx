import { Button, Form, Input, message, Select, Switch, Tag, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
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
import { EmailTemplatePreview } from '../../components/EmailTemplatePreview';
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
     * Picker mode: passing `onSelect` turns the overview list into the second way
     * of choosing a template — clicking a row's name hands it back to the opener,
     * which keeps owning the selection (the split-button menu still changes it).
     * Without it the dialog stays a pure manager (double-click a row to edit).
     */
    onSelect?: (template: InviteEmailTemplateDTO) => void;
    /** Template currently chosen in the composer — marked in the list. */
    selectedTemplateId?: number;
}

interface TemplateFormValues {
    kind: InviteEmailTemplateKind;
    name: string;
    language?: string;
    subject: string;
    body: string;
    active: boolean;
}

/**
 * Manage-templates dialog opened from the invite tabs' template select. Two views in
 * one dialog: the template list and the create/edit form. Deliberately NOT a separate
 * admin section — templates are only ever needed right where invites are sent.
 *
 * With `onSelect` the list doubles as a picker: clicking a template's name selects it
 * for the composer. Editing then only happens through the row's "Bearbeiten" button —
 * double-click-to-edit stays for the manager-only mode, where no click means "choose".
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
    const [form] = Form.useForm<TemplateFormValues>();
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingTemplate, setEditingTemplate] = useState<InviteEmailTemplateDTO | null>(null);

    // The preview follows what is typed, not what is saved — `useWatch` is the
    // only way to read a live antd form value without controlling every field.
    const previewSubject = Form.useWatch('subject', form) ?? '';
    const previewBody = Form.useWatch('body', form) ?? '';

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
        form.resetFields();
        form.setFieldsValue({ kind: templateKind, language: undefined, active: true });
        setView('form');
    }, [form, templateKind]);

    // Deep link from the invite composer ("Neue E-Mail-Vorlage erstellen"): open
    // straight in the create form instead of the list.
    useEffect(() => {
        if (initialView === 'create') {
            openCreateForm();
        }
    }, [initialView, openCreateForm]);

    const openEditForm = useCallback(
        (template: InviteEmailTemplateDTO) => {
            setEditingTemplate(template);
            form.setFieldsValue({
                kind: template.kind,
                name: template.name,
                language: template.language ?? undefined,
                subject: template.subject,
                body: template.body,
                active: template.active,
            });
            setView('form');
        },
        [form],
    );

    // The composer only offers active templates of its own tab's kind, so those are the
    // only rows that can be picked — selecting anything else would put a name on the
    // split button that the send call cannot use.
    const isSelectable = useCallback(
        (template: InviteEmailTemplateDTO) => onSelect != null && template.active && template.kind === templateKind,
        [onSelect, templateKind],
    );

    const backToList = useCallback(() => {
        setEditingTemplate(null);
        form.resetFields();
        setView('list');
    }, [form]);

    const onSubmit = useCallback(
        async (values: TemplateFormValues) => {
            setSubmitting(true);
            const payload: TemplateRequestDTO = {
                kind: values.kind,
                name: values.name,
                language: values.language || null,
                subject: values.subject,
                body: values.body,
                active: values.active,
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
        },
        [backToList, editingTemplate, loadTemplates, onChanged, t],
    );

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

    const formFooter = (
        <div className={styles.footerActions}>
            <DialogButton onClick={backToList} disabled={submitting}>
                {t('links.templates.back', 'Back')}
            </DialogButton>
            <DialogButton primary loading={submitting} onClick={() => form.submit()}>
                {t('links.templates.save', 'Save')}
            </DialogButton>
        </div>
    );

    // Title AND description follow the view: each of the three states is a
    // different job, so a single sentence would be wrong in two of them.
    let titleKey = 'links.templates.dialogTitle';
    let descriptionKey = onSelect ? 'links.templates.pickHint' : 'links.templates.dialogDescription';
    if (view !== 'list') {
        titleKey = editingTemplate ? 'links.templates.editTitle' : 'links.templates.newTitle';
        descriptionKey = editingTemplate ? 'links.templates.editDescription' : 'links.templates.newDescription';
    }

    return (
        <Modal
            titleKey={titleKey}
            descriptionKey={descriptionKey}
            icon={<EmailOutlinedIcon />}
            onClose={onClose}
            footer={view === 'list' ? listFooter : formFooter}
            width={1180}
        >
            {view === 'list' ? (
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
            ) : (
                <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ active: true }}>
                    {/* Form on the left, live preview on the right — below 920px the
                        preview drops under the fields (see the module stylesheet). */}
                    <div className={styles.formAndPreview}>
                        <div className={styles.formFields}>
                            <Form.Item
                                name="kind"
                                label={t('links.templates.field.kind', 'Kind')}
                                rules={[{ required: true, message: t('plsSelect') }]}
                            >
                                <Select
                                    options={TEMPLATE_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
                                />
                            </Form.Item>
                            <Form.Item
                                name="name"
                                label={t('links.templates.field.name', 'Vorlagenname')}
                                rules={[
                                    {
                                        required: true,
                                        whitespace: true,
                                        message: t('links.templates.field.nameRequired', 'Name is required'),
                                    },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item name="language" label={t('links.templates.field.language', 'Language')}>
                                <Input placeholder="de" />
                            </Form.Item>
                            <Form.Item
                                name="subject"
                                label={t('links.templates.field.subject', 'Subject')}
                                rules={[
                                    {
                                        required: true,
                                        whitespace: true,
                                        message: t('links.templates.field.subjectRequired', 'Subject is required'),
                                    },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="body"
                                label={t('links.templates.field.body', 'Body')}
                                rules={[
                                    {
                                        required: true,
                                        whitespace: true,
                                        message: t('links.templates.field.bodyRequired', 'Body is required'),
                                    },
                                ]}
                                extra={
                                    <>
                                        {t('links.templates.field.bodyHelp', 'Available placeholders:')}{' '}
                                        {/* Placeholder tokens are literal template syntax, not prose — kept out of
                                    i18next's t() so its {{var}} interpolation does not try to substitute them. */}
                                        <code>
                                            {'{{inviteLink}}, {{email}}, {{firstName}}, {{lastName}}, {{tenantId}}'}
                                        </code>
                                    </>
                                }
                            >
                                <Input.TextArea rows={8} />
                            </Form.Item>
                            <Form.Item
                                name="active"
                                label={t('links.templates.field.active', 'Active')}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </div>
                        <EmailTemplatePreview
                            body={previewBody}
                            previewLabel={t('links.templates.previewLabel', 'Email preview')}
                            subject={previewSubject}
                        />
                    </div>
                </Form>
            )}
        </Modal>
    );
};
