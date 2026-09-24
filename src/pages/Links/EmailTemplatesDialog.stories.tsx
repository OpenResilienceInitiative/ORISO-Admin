import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'antd';
import { useState } from 'react';
import { http, HttpResponse, delay } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth } from '../../utils/storybook/adminStoryDecorators';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';

const TEMPLATES_ENDPOINT = '*/service/useradmin/invite-email-templates';

const TEMPLATES: InviteEmailTemplateDTO[] = [
    {
        id: 1,
        kind: 'TENANT_INVITE',
        name: 'Träger-Willkommen (Standard)',
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
    const selectedName = TEMPLATES.find((template) => template.id === selectedTemplateId)?.name;

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

const createdTemplate = http.post(TEMPLATES_ENDPOINT, async ({ request }) => {
    const body = (await request.json()) as Partial<InviteEmailTemplateDTO>;
    return HttpResponse.json(
        { ...TEMPLATES[0], ...body, id: 99, createDate: '2026-07-13T10:00:00Z', updateDate: null },
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
                    'split button (load / new-from) and the live e-mail-kit preview. Persistence stays on the ' +
                    'existing invite-email-template endpoints.',
            },
        },
    },
    args: {
        templateKind: 'TENANT_INVITE',
        onClose: () => {},
    },
    decorators: [
        // `setStoryAuth` writes a shared token store, so every story states the role it
        // renders for instead of inheriting whatever ran before it. Default: the platform
        // admin (tenant 0), who sees every kind and may change the shared texts.
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
    parameters: { msw: { handlers: [templatesByKind, createdTemplate] } },
};

/**
 * Picker mode (how the invite composer opens it): clicking a template's name selects
 * it and closes the dialog. Only active templates of the opening tab's kind are
 * clickable — the rest stay plain text with an explanatory tooltip. The split-button
 * menu still changes the choice afterwards.
 */
export const Picker: Story = {
    args: { picker: true, selectedTemplateId: 1 },
    parameters: { msw: { handlers: [templatesByKind, createdTemplate] } },
};

/**
 * Straight into the create form (the composer's "Neue E-Mail-Vorlage erstellen"
 * deep link): the module editor with token pickers, split button and live
 * e-mail-kit preview inside the house dialog shell (#746).
 */
export const CreateView: Story = {
    args: { initialView: 'create' },
    parameters: { msw: { handlers: [templatesByKind, createdTemplate] } },
};

/** No templates yet — the empty state an admin lands on before creating the first one. */
export const Empty: Story = {
    parameters: {
        msw: { handlers: [http.get(TEMPLATES_ENDPOINT, () => HttpResponse.json([])), createdTemplate] },
    },
};

/** Templates request in flight — the table shows its loading spinner. */
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
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

/**
 * ORISO-Admin#1026 — a Träger admin (tenant 1) opens the manager. Creating a template is
 * theirs to do (owner decision 2026-09-23, confirmed by Frank 2026-09-24): "Neue Vorlage"
 * stays enabled. Changing a *stored* one is not — one text is shared by every Träger — so
 * "Bearbeiten" stays visible but disabled with the reason, per the house rule
 * "disable, don't hide".
 */
export const TraegerAdminSharedTemplateLocked: Story = {
    args: { templateKind: 'COUNSELLOR_INVITE' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.UserAdmin], 1);
            return <Story />;
        },
    ],
    parameters: { msw: { handlers: [templatesByKind, createdTemplate] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Vorlagen verwalten' }));
        const body = within(canvasElement.ownerDocument.body);
        const editButtons = await body.findAllByRole('button', { name: /Bearbeiten|Edit/ });
        editButtons.forEach((button) => expect(button).toBeDisabled());
        await expect(body.getByRole('button', { name: /Neue Vorlage|New template/ })).toBeEnabled();
    },
};
