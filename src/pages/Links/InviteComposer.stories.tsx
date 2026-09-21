import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import {
    accountInviteAcceptBaseUrl,
    createAccountInvite,
    listInviteEmailTemplates,
    type InviteEmailTemplateDTO,
} from '../../api/accountInvites/accountInvites';
import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';
import type { IdUnitOption } from '../../components/IdAllocationField';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { EmailTemplatesDialog } from './EmailTemplatesDialog';
import { InviteComposer, sendModeStorageKey, type InviteComposerProps } from './InviteComposer';

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

const COUNSELLOR_TEMPLATES: InviteEmailTemplateDTO[] = [
    { ...TEMPLATES[0], id: 11, kind: 'COUNSELLOR_INVITE', name: 'Berater:innen-Willkommen' },
];

const templatesByKind = http.get(TEMPLATES_ENDPOINT, ({ request }) => {
    const kind = new URL(request.url).searchParams.get('kind');
    return HttpResponse.json(TEMPLATES.filter((template) => !kind || template.kind === kind));
});

/**
 * Stubbed allocation client (#570 worked example): ids 1–20 assigned, 30–35
 * reserved. Auto adopts 21, stepping skips the taken ranges, typing 30 blocks.
 */
const TAKEN_TENANT_IDS = new Set<number>([...Array.from({ length: 20 }, (_, i) => i + 1), 30, 31, 32, 33, 34, 35]);
// Agencies: 1–140 exist, 150–152 are held by open invites — the next free agency number is 141.
const TAKEN_AGENCY_IDS = new Set<number>([...Array.from({ length: 140 }, (_, i) => i + 1), 150, 151, 152]);

const stubbedAllocation = (taken: Set<number>, reserved: (id: number) => boolean): IdAllocationClient => ({
    checkIdAvailability: async (id) => {
        let state: IdAllocationState = 'FREE';
        if (taken.has(id)) state = reserved(id) ? 'RESERVED' : 'ASSIGNED';
        return { id, state };
    },
    nextFreeId: async ({ from, direction }) => {
        let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
        while (candidate >= 1 && candidate <= 999) {
            if (!taken.has(candidate)) return { id: candidate };
            candidate += direction === 'up' ? 1 : -1;
        }
        return { id: null };
    },
});

const stubbedTenantIdAllocation = stubbedAllocation(TAKEN_TENANT_IDS, (id) => id >= 30 && id <= 35);
const stubbedAgencyIdAllocation = stubbedAllocation(TAKEN_AGENCY_IDS, (id) => id >= 150 && id <= 152);

/*
 * Type-ahead fixtures (#1026). The real search endpoints come with the
 * "existing agency" backend (built in parallel); the composer only sees the
 * `searchTenants` / `searchAgencies` props, so wiring them later is a swap.
 */
const TENANTS: IdUnitOption[] = [
    { id: 7, name: 'Caritas Südbaden' },
    { id: 12, name: 'Diakonie Ortenau' },
    { id: 15, name: 'AWO Freiburg' },
];

const AGENCIES: Array<IdUnitOption & { tenantId: number }> = [
    { id: 101, tenantId: 7, name: 'Caritas Suchtberatung Freiburg', topics: ['Sucht', 'Glücksspiel'] },
    { id: 102, tenantId: 7, name: 'Caritas Schuldnerberatung Lörrach', topics: ['Schulden'] },
    { id: 118, tenantId: 12, name: 'Diakonie Jugendberatung Offenburg', topics: ['U25', 'Familie'] },
    { id: 130, tenantId: 15, name: 'AWO Migrationsberatung', topics: ['Migration'] },
];

const matches = (unit: IdUnitOption, query: string) =>
    query === '' ||
    `${unit.id} ${unit.name ?? ''} ${(unit.topics ?? []).join(' ')}`.toLowerCase().includes(query.toLowerCase());

const searchTenants = async (query: string) => TENANTS.filter((tenant) => matches(tenant, query));

const searchAgencies = async (query: string, { tenantId }: { tenantId?: number }) =>
    AGENCIES.filter((agency) => (tenantId == null || agency.tenantId === tenantId) && matches(agency, query)).map(
        ({ tenantId: _tenantId, ...agency }) => agency,
    );

const defaultHandlers = [
    templatesByKind,
    http.post(INVITES_ENDPOINT, () =>
        HttpResponse.json({ id: 99, acceptUrl: 'https://admin.example/account-invite/token' }, { status: 201 }),
    ),
];

/**
 * The whole invite bar (#1026) as the redesign shows it: E-Mail · Vorname ·
 * Name · Rolle · Träger · Beratungsstelle · Themen selbst · Vorlage · Senden.
 * Rolle and "Themen selbst" are live here (`placeholdersEnabled`); the app
 * shows them disabled until the backend takes them.
 */
const InviteBar = (props: Partial<InviteComposerProps>) => (
    <div style={{ padding: 24 }}>
        <InviteComposer
            includeAgencyField
            persistKey="INVITE_BAR_1026"
            placeholdersEnabled
            requireNames
            agencyIdAllocation={stubbedAgencyIdAllocation}
            searchAgencies={searchAgencies}
            searchTenants={searchTenants}
            templateId={11}
            templates={COUNSELLOR_TEMPLATES}
            tenantAllowCreate
            tenantIdAllocation={stubbedTenantIdAllocation}
            onManageTemplates={() => {}}
            onSubmit={() => true}
            {...props}
        />
    </div>
);

/**
 * Wires the composer the same way AccountInvitesTab does: templates come from the
 * (MSW-mocked) template endpoint, submits go through `createAccountInvite`, and the
 * template pill opens EmailTemplatesDialog in list/picker view.
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
                defaultRole="TENANT_ADMIN"
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
            />
            {dialogView && (
                <EmailTemplatesDialog
                    initialView={dialogView}
                    selectedTemplateId={templateId}
                    templateKind="TENANT_INVITE"
                    onClose={() => setDialogView(null)}
                    onSelect={(template) => {
                        setTemplateId(template.id);
                        setDialogView(null);
                    }}
                />
            )}
        </div>
    );
};

const meta = {
    title: 'Organisms/Pages/Links/InviteComposer',
    component: InviteBar,
    parameters: { layout: 'fullscreen' },
    decorators: [
        withAdminProviders,
        // antd flips a dropdown upwards when its trigger sits at the very top of
        // the frame, which put the open template menu off-screen in Storybook.
        // The real page has the tab row above the composer — same headroom here.
        (Story) => <div style={{ paddingTop: 96 }}>{Story()}</div>,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            window.localStorage.removeItem(sendModeStorageKey('INVITE_BAR_1026'));
            window.localStorage.removeItem(sendModeStorageKey('TENANT_ADMIN'));
            return <Story />;
        },
    ],
} satisfies Meta<typeof InviteBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// The Storybook i18n resolves the browser language, so queries accept de and en.
const either = (de: string, en: string) => new RegExp(`^(${de}|${en})`);
const PILL = {
    email: either('E-Mail bearbeiten', 'Edit E-mail'),
    firstName: either('Vorname bearbeiten', 'Edit First name'),
    lastName: either('Name bearbeiten', 'Edit Name'),
    tenant: either('Träger bearbeiten', 'Edit Tenant'),
    agency: either('Beratungsstelle bearbeiten', 'Edit Agency'),
};
const FIELD = {
    email: /^(E-Mail|E-mail)$/,
    firstName: /^(Vorname|First name)$/,
    tenant: /^(Träger|Tenant)$/,
    agency: /^(Beratungsstelle|Agency)$/,
    role: /^(Rolle|Role)$/,
    topics: /^(Themen selbst|Own topics)$/,
};
const SEND = {
    invite: either('Einladen', 'Invite'),
    createAndInvite: either('Anlegen & einladen', 'Create & invite'),
};

const PREFILLED = {
    recipientEmail: 'maria.huber@example.org',
    firstName: 'Maria',
    lastName: 'Huber',
    tenant: TENANTS[0],
    agency: { id: 101, name: 'Caritas Suchtberatung Freiburg', topics: ['Sucht', 'Glücksspiel'] },
};

/**
 * Nothing filled yet, platform admin: every field editable, Träger and
 * Beratungsstelle rest on "Neu" (a new unit with the next free number), so the
 * send button would read „Anlegen & einladen" — outlined and off until the
 * e-mail and names are there. The hint under the row names what is missing.
 */
export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('button', { name: SEND.createAndInvite })).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: FIELD.tenant })).toBeEnabled();
        await expect(canvas.getByRole('switch', { name: FIELD.topics })).toBeEnabled();
    },
};

/**
 * The core interaction as a test: type → blur → "✓ E-Mail" pill → click →
 * the full field is back with the caret at the end → blur again collapses.
 * Ends with E-Mail and Vorname collapsed, the rest still open.
 */
export const PartiallyCollapsed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const email = await canvas.findByRole('textbox', { name: FIELD.email });
        await userEvent.type(email, PREFILLED.recipientEmail);
        await userEvent.tab();

        const emailPill = await canvas.findByRole('button', { name: PILL.email });
        await expect(emailPill).toHaveTextContent(/E-Mail|E-mail/);
        await expect(canvas.queryByRole('textbox', { name: FIELD.email })).not.toBeInTheDocument();

        await userEvent.click(emailPill);
        const expanded = await canvas.findByRole('textbox', { name: FIELD.email });
        await waitFor(() => expect(expanded).toHaveFocus());
        await expect(expanded).toHaveValue(PREFILLED.recipientEmail);
        await expect((expanded as HTMLInputElement).selectionStart).toBe(PREFILLED.recipientEmail.length);

        await userEvent.click(canvas.getByRole('textbox', { name: FIELD.firstName }));
        await userEvent.type(canvas.getByRole('textbox', { name: FIELD.firstName }), PREFILLED.firstName);
        await userEvent.tab();
        await canvas.findByRole('button', { name: PILL.email });
        await canvas.findByRole('button', { name: PILL.firstName });
    },
};

/** Everything valid: every field is a ✓ pill, existing units picked, the send button reads „Einladen". */
export const AllValid: Story = {
    args: { initialValues: PREFILLED },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await Promise.all(Object.values(PILL).map((pill) => canvas.findByRole('button', { name: pill })));
        await expect(canvas.getByRole('button', { name: SEND.invite })).toBeEnabled();
    },
};

/**
 * Invalid input never collapses: a malformed address keeps its field open with
 * the existing error text, and a number reserved by an open invite blocks the
 * Beratungsstelle with its own message. Validation rules are unchanged.
 */
export const ErrorState: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), 'maria.huber@');
        await userEvent.tab();
        await expect(canvas.getByRole('textbox', { name: FIELD.email })).toHaveAttribute('aria-invalid', 'true');
        await expect(canvas.queryByRole('button', { name: PILL.email })).not.toBeInTheDocument();

        const agency = canvas.getByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await userEvent.type(agency, '150');
        await canvas.findByText(/durch eine offene Einladung reserviert|reserved by an open invite/);
        await userEvent.keyboard('{Escape}');
        await userEvent.tab();
        await expect(canvas.queryByRole('button', { name: PILL.agency })).not.toBeInTheDocument();
    },
};

/**
 * Type-ahead into an EXISTING Beratungsstelle: searching "sucht" finds the
 * agency by its topic; picking it turns the main label into „Einladen".
 */
export const ExistingAgencySelected: Story = {
    args: {
        initialValues: {
            recipientEmail: PREFILLED.recipientEmail,
            firstName: PREFILLED.firstName,
            lastName: PREFILLED.lastName,
            tenant: TENANTS[0],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const agency = await canvas.findByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await expect(agency).toHaveAttribute('aria-expanded', 'true');
        await userEvent.type(agency, 'sucht');
        await userEvent.click(await body.findByRole('option', { name: /Caritas Suchtberatung Freiburg/ }));

        await expect(agency).toHaveValue('Caritas Suchtberatung Freiburg · 101');
        await expect(canvas.getByRole('button', { name: SEND.invite })).toBeEnabled();
    },
};

/**
 * The open type-ahead: a click into the Beratungsstelle lists „＋ Neu anlegen
 * (nächste freie Nummer: 141)" first, then the Träger's existing agencies with
 * number and topics. Typing narrows by name OR topic; a typed number is offered too.
 */
export const TypeAheadOpen: Story = {
    args: {
        initialValues: {
            recipientEmail: PREFILLED.recipientEmail,
            firstName: PREFILLED.firstName,
            lastName: PREFILLED.lastName,
            tenant: TENANTS[0],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('combobox', { name: FIELD.agency }));
        await body.findByRole('option', { name: /141/ });
        await body.findByRole('option', { name: /Caritas Schuldnerberatung Lörrach/ });
        // Scoped to the chosen Träger: the Diakonie agency of another Träger is not offered.
        await expect(body.queryByRole('option', { name: /Diakonie/ })).not.toBeInTheDocument();
    },
};

/**
 * A NEW Beratungsstelle: the ⌄/^ split steps through free numbers only (1–140
 * exist, so ^ lands on 141) and hard-overwrites the value — the send button
 * says „Anlegen & einladen".
 */
export const NewAgencyNumber: Story = {
    args: {
        initialValues: {
            recipientEmail: PREFILLED.recipientEmail,
            firstName: PREFILLED.firstName,
            lastName: PREFILLED.lastName,
            tenant: TENANTS[0],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const agency = await canvas.findByRole('combobox', { name: FIELD.agency });
        // The Beratungsstelle is the last ID field in the row, so its ^ is the last one.
        const agencyUp = canvas.getAllByRole('button', { name: /Wert erhöhen|Increase value/ }).at(-1) as HTMLElement;
        await userEvent.click(agencyUp);
        await waitFor(() => expect(agency).toHaveValue('141'));
        await expect(canvas.getByRole('button', { name: SEND.createAndInvite })).toBeEnabled();
    },
};

/** Tenant admin: the Träger is pinned to their own (visible, disabled); roles stay open. */
export const TenantAdminLocked: Story = {
    args: { viewerScope: 'tenant', ownTenant: TENANTS[0] },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const tenant = await canvas.findByRole('combobox', { name: FIELD.tenant });
        await expect(tenant).toBeDisabled();
        await expect(tenant).toHaveValue('Caritas Südbaden · 7');
        await expect(canvas.getByRole('combobox', { name: FIELD.agency })).toBeEnabled();
    },
};

/** Agency admin: Träger AND Beratungsstelle pinned, only „Berater:in" on offer — the invite goes into the own unit. */
export const AgencyAdminLocked: Story = {
    args: { viewerScope: 'agency', ownTenant: TENANTS[0], ownAgency: PREFILLED.agency },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('combobox', { name: FIELD.tenant })).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: FIELD.agency })).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: FIELD.agency })).toHaveValue(
            'Caritas Suchtberatung Freiburg · 101',
        );
        await expect(canvas.getByText(/^(Berater:in|Counsellor)$/)).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: SEND.invite })).toBeInTheDocument();
    },
};

/** Role switch: „Träger-Admin" hides the Beratungsstelle (and „Themen selbst"); „BST-Admin" hides only the toggle. */
export const RoleHidesFields: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('combobox', { name: FIELD.role }));
        await userEvent.click(await body.findByTitle(/BST-Admin|Agency admin/));
        await waitFor(() => expect(canvas.queryByRole('switch', { name: FIELD.topics })).not.toBeInTheDocument());
        await expect(canvas.getByRole('combobox', { name: FIELD.agency })).toBeInTheDocument();

        await userEvent.click(canvas.getByRole('combobox', { name: FIELD.role }));
        await userEvent.click(await body.findByTitle(/Träger-Admin|Tenant admin/));
        await waitFor(() => expect(canvas.queryByRole('combobox', { name: FIELD.agency })).not.toBeInTheDocument());
    },
};

/** In the app (not a story prop): Rolle and „Themen selbst" are disabled placeholders with a tooltip. */
export const PlaceholdersAsInApp: Story = {
    args: { placeholdersEnabled: false },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('switch', { name: FIELD.topics })).toBeDisabled();
    },
};

const phoneFrame = (width: number) => {
    const PhoneFrame: NonNullable<Meta<typeof InviteBar>['decorators']> = (Story) => (
        <div style={{ width, maxWidth: '100%', boxSizing: 'border-box', outline: '1px dashed #c4c7c8' }}>
            <Story />
        </div>
    );
    return PhoneFrame;
};

const PARTLY_FILLED = {
    recipientEmail: PREFILLED.recipientEmail,
    firstName: PREFILLED.firstName,
    lastName: PREFILLED.lastName,
    tenant: TENANTS[0],
};

/**
 * 412px phone (the issue's test width): filled fields have collapsed to pills,
 * so the row needs far less horizontal scrolling than the full-width fields.
 */
export const Mobile412: Story = {
    args: { initialValues: PARTLY_FILLED },
    decorators: phoneFrame(412),
    parameters: {
        viewport: { options: { phone412: { name: 'Phone 412', styles: { width: '412px', height: '915px' } } } },
    },
    globals: { viewport: { value: 'phone412', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await Promise.all(
            [PILL.email, PILL.firstName, PILL.lastName, PILL.tenant].map((pill) =>
                canvas.findByRole('button', { name: pill }),
            ),
        );
        // Tapping a pill brings the full field back (the interaction itself is tested in PartiallyCollapsed).
        await expect(canvas.getByRole('button', { name: PILL.email })).toBeEnabled();
    },
};

/** 320px, the smallest phone we support: same behaviour, pills keep every control reachable by scrolling. */
export const Mobile320: Story = {
    args: { initialValues: PARTLY_FILLED },
    decorators: phoneFrame(320),
    parameters: {
        viewport: { options: { phone320: { name: 'Phone 320', styles: { width: '320px', height: '640px' } } } },
    },
    globals: { viewport: { value: 'phone320', isRotated: false } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('button', { name: PILL.tenant })).toBeInTheDocument();
    },
};

/** Send is wired: pressing „Einladen" hands the composed values (incl. role and target) to `onSubmit`. */
export const SubmitsComposedValues: Story = {
    args: { initialValues: PREFILLED, onSubmit: fn(() => true) },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: SEND.invite }));
        await waitFor(() =>
            expect(args.onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientEmail: PREFILLED.recipientEmail,
                    role: 'COUNSELLOR',
                    tenantId: 7,
                    tenantTarget: 'existing',
                    agencyId: 101,
                    agencyTarget: 'existing',
                    topicsSelfManaged: true,
                    sendMode: 'direct',
                }),
            ),
        );
    },
};

/* ---- The Träger tab as wired today (AccountInvitesTab harness) ---------- */

/** Träger tab as the app wires it: a valid e-mail completes the form — „Anlegen & einladen". */
export const TenantTabValidDirect: Story = {
    render: () => <ComposerHarness />,
    parameters: { msw: { handlers: defaultHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
        await userEvent.type(canvas.getByRole('textbox', { name: FIELD.firstName }), 'Maria');
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name$/ }), 'Huber');
    },
};

/**
 * The persisted secondary option: "Empfänger nur anlegen" was chosen earlier and
 * survives reloads via localStorage until the admin switches back. Submitting in
 * this mode posts without a templateId (create without sending).
 */
export const TenantTabCreateOnlyMode: Story = {
    render: () => <ComposerHarness />,
    parameters: { msw: { handlers: defaultHandlers } },
    decorators: [
        (Story) => {
            window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');
            return <Story />;
        },
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
    },
};

/**
 * Clicking the template pill opens EmailTemplatesDialog in list/picker view.
 * Create stays inside the dialog; picking a row selects it and closes.
 */
export const TenantTabTemplateDialogOpen: Story = {
    render: () => <ComposerHarness />,
    parameters: { msw: { handlers: defaultHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const templatePill = await canvas.findByRole('button', { name: /Träger-Willkommen/ });
        await userEvent.click(templatePill);
    },
};

/**
 * Manual mode with a blocking state (#570): typing 30 hits an id reserved by an
 * open invite — error state on the field, helper text explains, sending stays
 * blocked until the id is free or „＋ Neu anlegen" resets the field.
 */
export const TenantTabReservedIdBlocksSending: Story = {
    render: () => <ComposerHarness />,
    parameters: { msw: { handlers: defaultHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
        await userEvent.type(canvas.getByRole('combobox', { name: FIELD.tenant }), '30');
        await canvas.findByText(/durch eine offene Einladung reserviert|reserved by an open invite/);
    },
};
