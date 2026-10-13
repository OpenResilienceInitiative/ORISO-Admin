import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'antd';
import { useState } from 'react';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import previewDe from '../../components/EmailPreview/fixtures/invite-long-content-de.html?raw';
import previewEn from '../../components/EmailPreview/fixtures/invite-platform-en.html?raw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth } from '../../utils/storybook/adminStoryDecorators';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';

const TEMPLATES_ENDPOINT = '*/service/useradmin/invite-email-templates';

/** The list is asked per kind; a Träger admin asks for the Träger kind too, which these stories leave empty. */
const emptyUnlessBerater = (request: Request) =>
    new URL(request.url).searchParams.get('kind') === 'COUNSELLOR_INVITE' ? undefined : HttpResponse.json([]);

const TEMPLATES: InviteEmailTemplateDTO[] = [
    {
        id: 1,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (Standard)',
        systemDefault: true,
        editable: false,
        language: 'de',
        subject: 'Ihr Zugang zur Beratungsplattform',
        body: 'Hallo {{firstName}},\n\nüber diesen Link richten Sie Ihren Zugang ein: {{inviteLink}}',
        active: true,
        createDate: '2026-07-01T10:00:00Z',
        updateDate: '2026-07-05T09:00:00Z',
    },
    {
        id: 2,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (englisch)',
        systemDefault: true,
        editable: false,
        language: 'en',
        subject: 'Your access to the counselling platform',
        body: 'Hello {{firstName}},\n\nset up your access here: {{inviteLink}}',
        active: false,
        createDate: '2026-07-02T10:00:00Z',
        updateDate: null,
    },
    {
        id: 4,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (Kurzfassung)',
        language: 'de',
        subject: 'Ihr Zugang — kurz und knapp',
        body: 'Hallo {{firstName}}, hier ist Ihr Zugang: {{inviteLink}}',
        active: true,
        createDate: '2026-07-04T10:00:00Z',
        updateDate: null,
    },
    {
        id: 3,
        kind: 'COUNSELLOR_INVITE',
        name: 'Berater-Willkommen',
        language: 'de',
        subject: 'Ihr Berater-Zugang',
        body: 'Hallo {{firstName}}, hier entlang: {{inviteLink}}',
        active: true,
        createDate: '2026-07-02T10:00:00Z',
        updateDate: null,
    },
];

/**
 * Mount-on-click harness (same pattern as CreateAgencyModal.stories): opening the
 * dialog at story-mount time leaves antd's zoom-in motion stuck under StrictMode's
 * double mount, so a trigger button mounts it on demand — matching real usage.
 * With `picker` it also stands in for the invite composer, which owns the selection.
 */
const DialogHarness = ({
    picker = false,
    ...props
}: React.ComponentProps<typeof EmailTemplatesDialog> & { picker?: boolean }) => {
    const [open, setOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(props.selectedTemplateId);
    const [selectedName, setSelectedName] = useState(
        TEMPLATES.find((template) => template.id === props.selectedTemplateId)?.name,
    );

    return (
        <>
            <Button onClick={() => setOpen(true)}>Vorlagen verwalten</Button>
            {picker && (
                <p style={{ marginTop: 12 }}>
                    Gewählte Vorlage: <strong>{selectedName ?? '—'}</strong>
                </p>
            )}
            {open && (
                <EmailTemplatesDialog
                    {...props}
                    selectedTemplateId={selectedTemplateId}
                    onClose={() => setOpen(false)}
                    onSelect={
                        picker
                            ? (template) => {
                                  setSelectedTemplateId(template.id);
                                  setSelectedName(template.name);
                                  setOpen(false);
                              }
                            : undefined
                    }
                />
            )}
        </>
    );
};

const templatesByKind = http.get(TEMPLATES_ENDPOINT, ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind');
    return HttpResponse.json(TEMPLATES.filter((template) => !kind || template.kind === kind));
});

/** Server-rendered mail fixtures: the story never invents a second mail renderer. */
const previewHandler = http.post(`${TEMPLATES_ENDPOINT}/preview`, async ({ request }) => {
    const draft = (await request.json()) as { language?: string; subject?: string; kind?: string };
    return HttpResponse.json({
        templateId: null,
        templateName: null,
        kind: draft.kind ?? 'TENANT_INVITE',
        language: draft.language || 'de',
        subject: draft.subject || 'Ihre Einladung',
        html: draft.language === 'en' ? previewEn : previewDe,
        plainText: 'Synthetic invitation preview',
        sampleAcceptUrl: 'https://example.invalid/preview',
    });
});
const previewTenants = http.get('*/service/tenantadmin/search', () =>
    HttpResponse.json({ _embedded: [{ id: 1, name: 'Springfield' }], total: 1 }),
);
const updatedTemplate = http.put(`${TEMPLATES_ENDPOINT}/:id`, async ({ request, params }) =>
    HttpResponse.json({
        ...TEMPLATES.find((template) => String(template.id) === params.id),
        ...((await request.json()) as object),
    }),
);
const deletedTemplate = http.delete(`${TEMPLATES_ENDPOINT}/:id`, () => new HttpResponse(null, { status: 204 }));

const createdTemplate = http.post(TEMPLATES_ENDPOINT, async ({ request }) => {
    const body = (await request.json()) as Partial<InviteEmailTemplateDTO>;
    return HttpResponse.json(
        {
            ...TEMPLATES[0],
            ...body,
            systemDefault: false,
            editable: true,
            id: 99,
            createDate: '2026-07-13T10:00:00Z',
            updateDate: null,
        },
        { status: 201 },
    );
});

const meta = {
    title: 'Organisms/Pages/Links/EmailTemplatesDialog',
    component: DialogHarness,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Template manager/picker of the invite tabs. Since #746 the create/edit view is the ' +
                    'placeholder-template module in the house dialog shell: per-kind token pickers, template ' +
                    'persistent footer (existing-template loader and name), explicit overwrite confirmation, language select and the live e-mail-kit preview. Persistence stays on the ' +
                    'existing invite-email-template endpoints.',
            },
        },
    },
    args: {
        templateKind: 'TENANT_INVITE',
        onClose: () => {},
    },
    decorators: [
        // `setStoryAuth` writes a shared store, so each story sets its own role.
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
            return <Story />;
        },
    ],
} satisfies Meta<typeof DialogHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** List view with templates of every kind, the opening tab's kind sorted first. */
export const Filled: Story = {
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                templatesByKind,
                createdTemplate,
                updatedTemplate,
                deletedTemplate,
            ],
        },
    },
};

/**
 * Picker mode (how the invite composer opens it): clicking a template's name selects
 * it and closes the dialog. Only active templates of the opening tab's kind are
 * clickable — the rest stay plain text with an explanatory tooltip. The split-button
 * menu still changes the choice afterwards.
 */
export const Picker: Story = {
    args: { picker: true, selectedTemplateId: 1 },
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                templatesByKind,
                createdTemplate,
                updatedTemplate,
                deletedTemplate,
            ],
        },
    },
};

/**
 * Straight into the create form (the composer's "Neue E-Mail-Vorlage erstellen"
 * deep link): the module editor with token pickers, split button and live
 * e-mail-kit preview inside the house dialog shell (#746).
 */
export const CreateView: Story = {
    args: { initialView: 'create' },
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                templatesByKind,
                createdTemplate,
                updatedTemplate,
                deletedTemplate,
            ],
        },
    },
};

/** No templates yet — the empty state an admin lands on before creating the first one. */
export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])),
                createdTemplate,
            ],
        },
    },
};

/** Templates request in flight — the table shows its loading spinner. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                updatedTemplate,
                deletedTemplate,
                http.get(TEMPLATES_ENDPOINT, async () => {
                    await delay('infinite');
                    return HttpResponse.json([]);
                }),
            ],
        },
    },
};

/** Backend failure (500) — the load fails with the translated error message. */
export const Error: Story = {
    parameters: {
        msw: { handlers: [http.get(TEMPLATES_ENDPOINT, () => new HttpResponse(null, { status: 500 }))] },
    },
};

/** A Träger admin may create templates and edit their own; the platform's stays disabled. */
export const TraegerAdminOwnAndPlatformTemplates: Story = {
    args: { templateKind: 'COUNSELLOR_INVITE' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.UserAdmin], 1);
            return <Story />;
        },
    ],
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                updatedTemplate,
                deletedTemplate,
                http.get(
                    TEMPLATES_ENDPOINT,
                    ({ request }) =>
                        emptyUnlessBerater(request) ??
                        HttpResponse.json([
                            {
                                ...TEMPLATES[3],
                                id: 31,
                                name: 'Unsere eigene Berater-Einladung',
                                tenantId: 1,
                                editable: true,
                            },
                            {
                                ...TEMPLATES[3],
                                id: 32,
                                name: 'Berater-Willkommen (Plattform)',
                                systemDefault: true,
                                tenantId: null,
                                editable: false,
                            },
                        ]),
                ),
                createdTemplate,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagen verwalten' }));
        const body = within(canvasElement.ownerDocument.body);
        // By name: the list sorts by kind and date.
        await body.findByText('Unsere eigene Berater-Einladung');
        // No `new Error()`: this file's `Error` story shadows the global.
        const editButtonInRowOf = (name: string) =>
            within(body.getByText(name).closest('tr') as HTMLElement).getByRole('button', {
                name: /Bearbeiten|Edit/,
            });
        await expect(editButtonInRowOf('Unsere eigene Berater-Einladung')).toBeEnabled();
        await expect(editButtonInRowOf('Berater-Willkommen (Plattform)')).toBeDisabled();
        await expect(body.getByRole('button', { name: /Neue Vorlage|New template/ })).toBeEnabled();
    },
};

const lockedRow = (id: number, name: string): InviteEmailTemplateDTO => ({
    ...TEMPLATES[3],
    id,
    name,
    tenantId: null,
    editable: false,
});

/**
 * A Träger admin sees several shared templates: the lock reason on the first row (under the
 * header) and on the last row must both be readable, not clipped by the scrolling table body.
 */
export const LockReasonReadableOnFirstAndLastRow: Story = {
    args: { templateKind: 'COUNSELLOR_INVITE' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.UserAdmin], 1);
            return <Story />;
        },
    ],
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                updatedTemplate,
                deletedTemplate,
                http.get(
                    TEMPLATES_ENDPOINT,
                    ({ request }) =>
                        emptyUnlessBerater(request) ??
                        HttpResponse.json(
                            Array.from({ length: 8 }, (_, index) =>
                                lockedRow(40 + index, `Geteilte Vorlage ${index + 1}`),
                            ),
                        ),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagen verwalten' }));
        const doc = canvasElement.ownerDocument;
        const body = within(doc.body);
        await body.findByText('Geteilte Vorlage 8');
        // The dialog zooms in; measure the rows once it has settled.
        await waitFor(() => expect(doc.querySelector('.ant-modal[class*="ant-zoom"]')).toBeNull());
        const rows = doc.querySelectorAll<HTMLElement>('.ant-table-tbody tr.ant-table-row');
        const expectReadableLockReason = async (row: HTMLElement) => {
            const trigger = within(row)
                .getByRole('button', { name: /Bearbeiten|Edit/ })
                .closest('[tabindex="0"]');
            await expect(trigger).not.toBeNull();
            (trigger as HTMLElement).focus();
            const tooltip = await body.findByRole('tooltip');
            // Outside the scrolling body, fully inside the viewport, and stacked above the dialog.
            await expect(tooltip.closest('.ant-table-body')).toBeNull();
            const rect = tooltip.getBoundingClientRect();
            const view = doc.defaultView as Window;
            await expect(rect.top >= 0 && rect.left >= 0).toBe(true);
            await expect(rect.bottom <= view.innerHeight && rect.right <= view.innerWidth).toBe(true);
            // Anchored to its own button: centred over it, just above it.
            const anchor = (trigger as HTMLElement).getBoundingClientRect();
            await expect(Math.abs(rect.left + rect.width / 2 - (anchor.left + anchor.width / 2))).toBeLessThan(2);
            await expect(Math.abs(anchor.top - rect.bottom - 4)).toBeLessThan(2);
            const dialogLayer = Number(view.getComputedStyle(row.closest('.ant-modal-wrap') as Element).zIndex);
            await expect(Number(view.getComputedStyle(tooltip).zIndex)).toBeGreaterThan(dialogLayer);
            (trigger as HTMLElement).blur();
        };
        await expectReadableLockReason(rows[0]);
        await expectReadableLockReason(rows[rows.length - 1]);
    },
};

/** A newly created active template closes the picker and becomes the invitation choice. */
export const CreateAndUse: Story = {
    args: { picker: true, selectedTemplateId: 1, initialView: 'create' },
    parameters: {
        msw: {
            handlers: [
                previewHandler,
                previewTenants,
                templatesByKind,
                createdTemplate,
                updatedTemplate,
                deletedTemplate,
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagen verwalten' }));
        const dialog = within(await body.findByRole('dialog'));
        await userEvent.type(dialog.getByLabelText('Vorlagenname'), 'Neue Einladung');
        await userEvent.type(dialog.getByLabelText('Betreff'), 'Willkommen');
        await userEvent.type(dialog.getByLabelText('Inhalt'), 'Ihr Zugang zur Beratung');
        await userEvent.click(dialog.getByRole('button', { name: 'Speichern' }));
        await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
        await expect(canvas.getByText('Neue Einladung')).toBeInTheDocument();
    },
};

/** Complete editor anatomy, including scroll/body/footer geometry in the real browser. */
export const FooterEditor: Story = {
    ...CreateView,
    play: async ({ canvasElement }) => {
        const doc = canvasElement.ownerDocument;
        const body = within(doc.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Vorlagen verwalten' }));
        const dialog = within(await body.findByRole('dialog'));
        const footer = dialog.getByTestId('template-editor-footer');
        await expect(within(footer).getByLabelText('Vorlagenname')).toBeInTheDocument();
        await expect(within(footer).getByLabelText('Bisherige Vorlagen')).toHaveRole('combobox');
        await expect(dialog.getByLabelText('Sprache')).toHaveRole('combobox');
        await expect(dialog.queryByRole('switch')).not.toBeInTheDocument();
        await expect(dialog.queryByRole('button', { name: 'Vorlagenmenü öffnen' })).not.toBeInTheDocument();
        await body.findByTitle('E-Mail-Vorschau');
        await waitFor(() => expect(doc.querySelector('.ant-modal[class*="ant-zoom"]')).toBeNull());
        const scrollBody = doc.querySelector('.ant-modal-body') as HTMLElement;
        const before = footer.getBoundingClientRect();
        await expect(before.bottom).toBeLessThanOrEqual(doc.defaultView!.innerHeight);
        scrollBody.scrollTop = scrollBody.scrollHeight;
        const after = footer.getBoundingClientRect();
        await expect(Math.abs(before.top - after.top)).toBeLessThan(1);
        await expect(after.bottom).toBeLessThanOrEqual(doc.defaultView!.innerHeight);
    },
};

export const FooterEditorMobile: Story = {
    ...FooterEditor,
    globals: { viewport: { value: 'phone', isRotated: false } },
};

/** Loading an existing template keeps its identity; cancellation leaves the draft intact. */
export const LoadAndOverwrite: Story = {
    ...CreateView,
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Vorlagen verwalten' }));
        const dialog = within(await body.findByRole('dialog'));
        await userEvent.click(dialog.getByLabelText('Bisherige Vorlagen'));
        await userEvent.click(
            await body.findByText('Träger-Willkommen (Kurzfassung)', { selector: '.ant-select-item-option-content' }),
        );
        await expect(dialog.getByLabelText('Vorlagenname')).toHaveValue('Träger-Willkommen (Kurzfassung)');
        await userEvent.click(dialog.getByRole('button', { name: 'Speichern' }));
        await expect(body.getByText('Vorlage überschreiben?')).toBeInTheDocument();
        await userEvent.click(body.getByRole('button', { name: 'Abbrechen' }));
        await expect(dialog.getByLabelText('Vorlagenname')).toHaveValue('Träger-Willkommen (Kurzfassung)');
        await userEvent.click(dialog.getByRole('button', { name: 'Speichern' }));
        await userEvent.click(body.getByRole('button', { name: 'Überschreiben' }));
        await body.findByText('E-Mail-Vorlagen');
    },
};

/** The existing Träger fixtures are reused for the same editor flow at both scoped roles. */
export const TraegerFooterEditor: Story = {
    ...TraegerAdminOwnAndPlatformTemplates,
    args: { templateKind: 'COUNSELLOR_INVITE', initialView: 'create' },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Vorlagen verwalten' }));
        const dialog = within(await body.findByRole('dialog'));
        await expect(dialog.queryByLabelText('Vorschau im Design von')).not.toBeInTheDocument();
        await userEvent.click(dialog.getByLabelText('Bisherige Vorlagen'));
        await userEvent.click(
            await body.findByText('Unsere eigene Berater-Einladung', { selector: '.ant-select-item-option-content' }),
        );
        await expect(dialog.getByLabelText('Vorlagenname')).toHaveValue('Unsere eigene Berater-Einladung');
        await userEvent.click(dialog.getByRole('button', { name: 'Speichern' }));
        await expect(body.getByRole('button', { name: 'Überschreiben' })).toBeEnabled();
        await userEvent.click(body.getByRole('button', { name: 'Abbrechen' }));
    },
};

export const AgencyFooterEditor: Story = {
    ...TraegerFooterEditor,
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.RestrictedAgencyAdmin], 1);
            return <Story />;
        },
    ],
};

export const DeleteConfirmation: Story = {
    ...Filled,
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Vorlagen verwalten' }));
        const name = await body.findByText('Träger-Willkommen (Kurzfassung)');
        await userEvent.click(within(name.closest('tr') as HTMLElement).getByRole('button', { name: 'Löschen' }));
        await expect(body.getByText('Vorlage löschen?')).toBeInTheDocument();
        await expect(
            within(canvasElement.ownerDocument.querySelector('.ant-modal-footer') as HTMLElement).getByRole('button', {
                name: 'Löschen',
            }),
        ).toBeEnabled();
        await userEvent.click(body.getByRole('button', { name: 'Abbrechen' }));
        await expect(body.getByText('Träger-Willkommen (Kurzfassung)')).toBeInTheDocument();
    },
};
