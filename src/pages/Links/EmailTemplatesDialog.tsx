import { Button, Form, Input, message, Select, Switch, Tag, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createInviteEmailTemplate,
    InviteEmailTemplateDTO,
    InviteEmailTemplateKind,
    listInviteEmailTemplates,
    TemplateRequestDTO,
    updateInviteEmailTemplate,
} from '../../api/accountInvites/accountInvites';
import { ListingTable, listingTableStyles } from '../../components/ListingTable';
import { Modal } from '../../components/Modal';

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
 * one dialog: the template list (double-click a row or hit edit to inspect it) and the
 * create/edit form. Deliberately NOT a separate admin section — templates are only
 * ever needed right where invites are sent.
 */
export const EmailTemplatesDialog = ({
    templateKind,
    initialView = 'list',
    onClose,
    onChanged,
}: EmailTemplatesDialogProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<TemplateFormValues>();
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingTemplate, setEditingTemplate] = useState<InviteEmailTemplateDTO | null>(null);

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
        [kindLabel, openEditForm, t],
    );

    const listFooter = (
        <div className={listingTableStyles.actionGroup}>
            <Button onClick={onClose}>{t('links.templates.close', 'Close')}</Button>
            <Button type="primary" className={listingTableStyles.createButton} onClick={openCreateForm}>
                {t('links.templates.new', 'New template')}
            </Button>
        </div>
    );

    const formFooter = (
        <div className={listingTableStyles.actionGroup}>
            <Button onClick={backToList}>{t('links.templates.back', 'Back')}</Button>
            <Button
                type="primary"
                className={listingTableStyles.createButton}
                loading={submitting}
                onClick={() => form.submit()}
            >
                {t('links.templates.save', 'Save')}
            </Button>
        </div>
    );

    let titleKey = 'links.templates.dialogTitle';
    if (view !== 'list') {
        titleKey = editingTemplate ? 'links.templates.editTitle' : 'links.templates.newTitle';
    }

    return (
        <Modal titleKey={titleKey} onClose={onClose} footer={view === 'list' ? listFooter : formFooter} width={860}>
            {view === 'list' ? (
                <ListingTable
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={sortedTemplates}
                    pagination={false}
                    scroll={{ y: 'auto' }}
                    onRow={(template: InviteEmailTemplateDTO) => ({
                        onDoubleClick: () => openEditForm(template),
                    })}
                />
            ) : (
                <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ active: true }}>
                    <Form.Item
                        name="kind"
                        label={t('links.templates.field.kind', 'Kind')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select options={TEMPLATE_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label={t('links.templates.field.name', 'Name')}
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
                                <code>{'{{inviteLink}}, {{email}}, {{firstName}}, {{lastName}}, {{tenantId}}'}</code>
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
                </Form>
            )}
        </Modal>
    );
};
