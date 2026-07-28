import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { userEvent, within } from 'storybook/test';
import {
    accountInviteAcceptBaseUrl,
    createAccountInvite,
    listInviteEmailTemplates,
    type InviteEmailTemplateDTO,
} from '../../api/accountInvites/accountInvites';
import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, sendModeStorageKey } from './InviteComposer';

const INVITES_ENDPOINT = '*/service/useradmin/account-invites';
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
        name: 'Carrier invite text only for northern German region',
        language: 'de',
        subject: 'Ihr Zugang (Region Nord)',
        body: 'Moin {{firstName}},\n\nhier entlang: {{inviteLink}}',
        active: true,
        createDate: '2026-07-02T10:00:00Z',
        updateDate: null,
    },
];

const templatesByKind = http.get(TEMPLATES_ENDPOINT, ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind');
    return HttpResponse.json(TEMPLATES.filter((template) => !kind || template.kind === kind));
});

/**
 * Stubbed allocation client (#570 worked example): ids 1–20 assigned, 30–35
 * reserved. Auto adopts 21, stepping skips the taken ranges, typing 30 blocks.
 * The real endpoints are built in parallel (TenantService U1); the wiring
 * chunk (U3/U6) replaces this stub with MSW handlers on the real paths.
 */
const TAKEN_IDS = new Set<number>([...Array.from({ length: 20 }, (_, i) => i + 1), 30, 31, 32, 33, 34, 35]);

const idStateOf = (id: number): IdAllocationState => {
    if (!TAKEN_IDS.has(id)) return 'FREE';
    return id >= 30 && id <= 35 ? 'RESERVED' : 'ASSIGNED';
};

const stubbedTenantIdAllocation: IdAllocationClient = {
    checkIdAvailability: async (id) => ({ id, state: idStateOf(id) }),
    nextFreeId: async ({ from, direction }) => {
        let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
        while (candidate >= 1 && candidate <= 999) {
            if (!TAKEN_IDS.has(candidate)) return { id: candidate };
            candidate += direction === 'up' ? 1 : -1;
        }
        return { id: null };
    },
    reserveId: async ({ id }) => ({ id: id ?? 21 }),
    releaseId: async () => {},
};

const defaultHandlers = [
    templatesByKind,
    http.post(INVITES_ENDPOINT, () =>
        HttpResponse.json({ id: 99, acceptUrl: 'https://admin.example/account-invite/token' }, { status: 201 }),
    ),
];

/**
 * Wires the composer the same way AccountInvitesTab does: templates come from the
 * (MSW-mocked) template endpoint, submits go through `createAccountInvite`, and the
 * template menu's create/delete entries open the EmailTemplatesDialog.
 */
const ComposerHarness = () => {
    const [templates, setTemplates] = useState<InviteEmailTemplateDTO[]>([]);
    const [templateId, setTemplateId] = useState<number | undefined>();
    const [dialogView, setDialogView] = useState<'list' | 'create' | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        listInviteEmailTemplates('TENANT_INVITE').then((loaded) => {
            setTemplates(loaded);
            setTemplateId(loaded.find((template) => template.active)?.id);
        });
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <InviteComposer
                persistKey="TENANT_ADMIN"
                requireTenantId
                submitting={submitting}
                templateId={templateId}
                tenantIdAllocation={stubbedTenantIdAllocation}
                templates={templates}
                onManageTemplates={(intent) => setDialogView(intent === 'create' ? 'create' : 'list')}
                onSubmit={async (values) => {
                    setSubmitting(true);
                    try {
                        await createAccountInvite({
                            acceptBaseUrl: accountInviteAcceptBaseUrl,
                            expiresInDays: 30,
                            firstName: values.firstName,
                            lastName: values.lastName,
                            recipientEmail: values.recipientEmail,
                            targetRole: 'TENANT_ADMIN',
                            templateId: values.templateId,
                            tenantId: values.tenantId,
                        });
                        return true;
                    } catch {
                        return false;
                    } finally {
                        setSubmitting(false);
                    }
                }}
                onTemplateIdChange={setTemplateId}
            />
            {dialogView && (
                <EmailTemplatesDialog
                    initialView={dialogView}
                    templateKind="TENANT_INVITE"
                    onClose={() => setDialogView(null)}
                />
            )}
        </div>
    );
};

const meta = {
    title: 'Organisms/Pages/Links/InviteComposer',
    component: ComposerHarness,
    parameters: { layout: 'fullscreen', msw: { handlers: defaultHandlers } },
    decorators: [
        withAdminProviders,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            return <Story />;
        },
    ],
} satisfies Meta<typeof ComposerHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Nothing filled yet: template preselected, Träger-ID visibly on `Auto` (#570 —
 * no browser-pinned id, the backend assigns the smallest free one), but the
 * missing recipient e-mail keeps the send split button in its outlined,
 * disabled resting state. Its chevron menu stays reachable so the send mode
 * can be switched at any time.
 */
export const Empty: Story = {
    decorators: [
        (Story) => {
            window.localStorage.removeItem(sendModeStorageKey('TENANT_ADMIN'));
            return <Story />;
        },
    ],
};

/** A valid e-mail completes the form — the send button turns primary ("Direkt Versenden"). */
export const ValidDirect: Story = {
    decorators: Empty.decorators,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('E-Mail'), 'maria.huber@example.org');
        await userEvent.type(canvas.getByLabelText('Vorname'), 'Maria');
        await userEvent.type(canvas.getByLabelText('Name'), 'Huber');
    },
};

/**
 * The persisted secondary option: "Empfänger nur anlegen" was chosen earlier and
 * survives reloads via localStorage until the admin switches back. Submitting in
 * this mode posts without a templateId (create without sending).
 */
export const CreateOnlyMode: Story = {
    decorators: [
        (Story) => {
            window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');
            return <Story />;
        },
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByLabelText('E-Mail'), 'maria.huber@example.org');
    },
};

/**
 * The template split button's chevron menu: active templates of this tab's kind
 * under the "auswählen oder erstellen" group, then create/delete entries that open
 * the EmailTemplatesDialog (delete stays disabled in the dialog — no backend
 * endpoint yet, see #314).
 */
export const TemplateMenuOpen: Story = {
    decorators: Empty.decorators,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('button', { name: /Träger-Willkommen/ });
        await userEvent.click(canvas.getByRole('button', { name: 'E-Mail-Vorlage wählen' }));
    },
};

/**
 * Manual mode with a blocking state (#570): typing 30 hits an id reserved by an
 * open invite — error state on the field, helper text explains, sending stays
 * blocked until the id is free or the visible Auto toggle resets the field.
 */
export const ReservedIdBlocksSending: Story = {
    decorators: Empty.decorators,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Locale-agnostic queries: the Storybook i18n may resolve de or en.
        await userEvent.type(await canvas.findByLabelText(/E-Mail/i), 'maria.huber@example.org');
        await userEvent.type(canvas.getByRole('textbox', { name: /Träger-ID|Tenant ID/ }), '30');
        await canvas.findByText(/durch eine offene Einladung reserviert|reserved by an open invite/);
    },
};
