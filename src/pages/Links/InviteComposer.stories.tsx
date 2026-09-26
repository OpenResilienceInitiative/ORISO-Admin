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

// The whole invite bar in field order: E-Mail · Vorname · Name · Rolle · Träger · Beratungsstelle · Themen · Vorlage · Senden.
const InviteBar = (props: Partial<InviteComposerProps>) => (
    <div style={{ padding: 24 }}>
        <InviteComposer
            includeAgencyField
            persistKey="INVITE_BAR_1026"
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
    role: either('Rolle bearbeiten', 'Edit Role'),
    topics: either('Themen & Fachbereiche bearbeiten', 'Edit Topics & departments'),
    alsoCounsellor: either('Berät auch bearbeiten', 'Edit Also counsels'),
    template: either('Vorlage bearbeiten', 'Edit Template'),
};
const FIELD = {
    email: /^(E-Mail|E-mail)$/,
    firstName: /^(Vorname|First name)$/,
    tenant: /^(Träger|Tenant)$/,
    agency: /^(Beratungsstelle|Agency)$/,
    role: /^(Rolle|Role)$/,
    topics: /^(Themen & Fachbereiche|Topics & departments)$/,
};
const SEND = {
    invite: either('Einladen', 'Invite'),
    sendAndNext: /^((Anlegen, einladen|Einladen) & nächste|(Create, invite|Invite) & next)$/,
    createAndInvite: either('Anlegen & einladen', 'Create & invite'),
};

const PREFILLED = {
    recipientEmail: 'maria.huber@example.org',
    firstName: 'Maria',
    lastName: 'Huber',
    tenant: TENANTS[0],
    agency: { id: 101, name: 'Caritas Suchtberatung Freiburg', topics: ['Sucht', 'Glücksspiel'] },
};

/** Nothing filled: Träger and Beratungsstelle rest on "Neu"; sending stays off until e-mail and names are there. */
export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('button', { name: SEND.createAndInvite })).toBeDisabled();
        await expect(canvas.getByRole('combobox', { name: FIELD.tenant })).toBeEnabled();
        // A fresh page starts expanded; pills only exist after „Senden & nächste".
        await expect(canvas.getByRole('combobox', { name: FIELD.role })).toBeInTheDocument();
        await expect(canvas.getByRole('combobox', { name: FIELD.topics })).toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: PILL.role })).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: PILL.template })).not.toBeInTheDocument();
    },
};

/** Picking a role after filling the names keeps every value and the same DOM (no remount). */
export const RoleSelectKeepsValues: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const bar = canvasElement.querySelector('[class*="composer"]');
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
        await userEvent.type(canvas.getByRole('textbox', { name: FIELD.firstName }), PREFILLED.firstName);
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name$/ }), PREFILLED.lastName);
        await userEvent.tab();

        await userEvent.click(canvas.getByRole('button', { name: PILL.role }));
        await userEvent.click(await body.findByTitle(/BST-Admin|Agency admin/));

        const pill = await canvas.findByRole('button', { name: PILL.role });
        await expect(pill).toHaveTextContent(/BST-Admin|Agency admin/);
        await expect(canvasElement.querySelector('[class*="composer"]')).toBe(bar);
        const values = [...canvasElement.querySelectorAll<HTMLInputElement>('input[name]')].map((input) => input.value);
        await expect(values).toEqual([PREFILLED.recipientEmail, PREFILLED.firstName, PREFILLED.lastName]);
        await expect(canvas.getByRole('button', { name: PILL.email })).toHaveAccessibleName(
            new RegExp(PREFILLED.recipientEmail.replace('.', '\\.')),
        );
    },
};

/** A row scrolled right gives the scroll back when fields collapse, so their pills stay visible. */
export const RowScrollSettlesAfterCollapse: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 900 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
        await userEvent.type(canvas.getByRole('textbox', { name: FIELD.firstName }), PREFILLED.firstName);
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name$/ }), PREFILLED.lastName);
        const scroller = canvasElement.querySelector<HTMLElement>('[class*="scroller"]') as HTMLElement;
        // The row sits scrolled to the right while focus is still in Name.
        scroller.scrollLeft = 400;
        await expect(scroller.scrollLeft).toBeGreaterThan(0);
        await userEvent.click(canvas.getByRole('combobox', { name: FIELD.tenant }));
        await userEvent.keyboard('{Escape}');

        const emailPill = await canvas.findByRole('button', { name: PILL.email });
        await waitFor(() =>
            expect(emailPill.getBoundingClientRect().left).toBeGreaterThanOrEqual(
                scroller.getBoundingClientRect().left - 1,
            ),
        );
    },
};

/** „Themen & Fachbereiche" open; a new invite defaults to „Keine weiteren Fachbereiche". */
export const TopicSelectOpen: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('combobox', { name: FIELD.topics }));
        await body.findByText(/Wählt selbst aus den vorhandenen Fachbereichen/);
        await body.findByText(/Darf neue Themen anlegen/);
    },
};

/** Type → blur → "✓ E-Mail" pill → click → field back, caret at the end → blur collapses again. */
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
        const collapsedEmail = await canvas.findByRole('button', { name: PILL.email });
        await canvas.findByRole('button', { name: PILL.firstName });
        // Re-collapsing mid-animation must not leave the slot frozen at the field's width.
        const slot = collapsedEmail.parentElement as HTMLElement;
        await waitFor(() =>
            expect(slot.getBoundingClientRect().width).toBeLessThanOrEqual(
                collapsedEmail.getBoundingClientRect().width + 1,
            ),
        );
    },
};

/** Everything valid: every field is a ✓ pill, existing units picked, the send button reads „Einladen". */
export const AllValid: Story = {
    args: { initialValues: PREFILLED },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // All eight fields, Rolle, Themen & Fachbereiche and Vorlage included, are pills.
        // („Berät auch" belongs to the BST-Admin role only.)
        await Promise.all(
            Object.entries(PILL)
                .filter(([key]) => key !== 'alsoCounsellor')
                .map(([, pill]) => canvas.findByRole('button', { name: pill })),
        );
        await expect(canvas.getByRole('button', { name: SEND.invite })).toBeEnabled();
    },
};

/** Invalid input never collapses: a malformed address or a taken number keeps its field open. */
export const ErrorState: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), 'maria.huber@');
        await userEvent.tab();
        await expect(canvas.getByRole('textbox', { name: FIELD.email })).toHaveAttribute('aria-invalid', 'true');
        await expect(canvas.queryByRole('button', { name: PILL.email })).not.toBeInTheDocument();

        const agency = canvas.getByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await userEvent.type(agency, '140');
        await canvas.findByText(/bereits vergeben|already taken/);
        await userEvent.keyboard('{Escape}');
        await userEvent.tab();
        await expect(canvas.queryByRole('button', { name: PILL.agency })).not.toBeInTheDocument();
    },
};

/** "sucht" finds an EXISTING Beratungsstelle by topic; picking it makes the label „Einladen". */
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

/** „＋ Neu anlegen" comes first, then the Träger's agencies; typing narrows by name or topic. */
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

/** A new Beratungsstelle is founded by a BST-Admin: the bar offers the switch, then „Anlegen & einladen". */
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
        await expect(canvas.getByRole('button', { name: SEND.createAndInvite })).toBeDisabled();
        await canvas.findByText(/Nur eine BST-Admin legt eine neue Beratungsstelle an|Only an agency admin creates/);

        await userEvent.click(
            canvas.getByRole('button', { name: /Stattdessen als BST-Admin einladen|Invite as agency admin instead/ }),
        );
        await expect(await canvas.findByRole('button', { name: PILL.role })).toHaveTextContent(
            /BST-Admin|Agency admin/,
        );
        await expect(canvas.getByRole('button', { name: PILL.alsoCounsellor })).toHaveTextContent(
            /Berät auch|Also counsels/,
        );
        await waitFor(() => expect(canvas.getByRole('button', { name: SEND.createAndInvite })).toBeEnabled());
    },
};

/** Number 150 is reserved by an open BST-Admin invite: the counsellor joins it and waits, no collision. */
export const CounsellorJoinsPendingAgency: Story = {
    args: {
        initialValues: {
            recipientEmail: PREFILLED.recipientEmail,
            firstName: PREFILLED.firstName,
            lastName: PREFILLED.lastName,
            tenant: TENANTS[0],
        },
        onSubmit: fn(() => true),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const agency = await canvas.findByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await userEvent.type(agency, '150');
        await canvas.findByText(
            /wird mit einer offenen Admin-Einladung angelegt|being created by an open admin invite/,
        );
        await userEvent.keyboard('{Escape}');
        const send = canvas.getByRole('button', { name: SEND.createAndInvite });
        await waitFor(() => expect(send).toBeEnabled());
        await userEvent.click(send);
        await waitFor(() =>
            expect(args.onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'COUNSELLOR',
                    agencyId: 150,
                    agencyIdAllocationMode: 'MANUAL',
                    tenantIdAllocationMode: 'EXISTING',
                    tenantId: TENANTS[0].id,
                    topicPermission: 'NONE',
                }),
            ),
        );
        // After a successful send the bar starts over: no type-ahead is left open over it.
        await waitFor(() => expect(canvas.getByRole('combobox', { name: FIELD.agency })).not.toHaveFocus());
        await expect(within(canvasElement.ownerDocument.body).queryByRole('listbox')).toBeNull();
    },
};

/** „BST-Admin" adds „Berät auch" (default on); „Nur Verwaltung" is what the submit then carries. */
export const AgencyAdminAlsoCounsellor: Story = {
    args: { initialValues: { ...PREFILLED, role: 'AGENCY_ADMIN' }, onSubmit: fn(() => true) },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const pill = await canvas.findByRole('button', { name: PILL.alsoCounsellor });
        await expect(pill).toHaveTextContent(/Berät auch|Also counsels/);
        await expect(canvas.queryByRole('button', { name: PILL.topics })).not.toBeInTheDocument();
        await userEvent.click(pill);
        await userEvent.click(await body.findByTitle(/Nur Verwaltung|Administration only/));
        await userEvent.click(canvas.getByRole('button', { name: SEND.invite }));
        await waitFor(() =>
            expect(args.onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'AGENCY_ADMIN',
                    alsoCounsellor: false,
                    agencyId: 101,
                    agencyIdAllocationMode: 'EXISTING',
                }),
            ),
        );
    },
};

/** Pressing „Einladen" right after picking a Beratungsstelle sends: the press must not move focus. */
export const SendRightAfterPickingAgency: Story = {
    args: {
        initialValues: {
            recipientEmail: PREFILLED.recipientEmail,
            firstName: PREFILLED.firstName,
            lastName: PREFILLED.lastName,
            tenant: TENANTS[0],
        },
        // Keeps the request pending, so the bar is observed as the click left it.
        onSubmit: fn(() => new Promise<boolean>(() => {})),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        const agency = await canvas.findByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await userEvent.type(agency, 'sucht');
        await userEvent.click(await body.findByRole('option', { name: /Caritas Suchtberatung Freiburg/ }));
        await expect(agency).toHaveFocus();
        const send = canvas.getByRole('button', { name: SEND.invite });
        await expect(send).toBeEnabled();
        await userEvent.click(send);
        // Focus stayed in the field: it did not collapse under the pointer.
        await expect(agency).toHaveFocus();
        await expect(canvas.queryByRole('button', { name: PILL.agency })).not.toBeInTheDocument();
        await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ agencyId: 101 })));
    },
};

/** „Mich selbst eintragen" sits in the send menu and hands over the Beratungsstelle chosen in the bar. */
export const SelfAssignMenuEntry: Story = {
    args: { initialValues: PREFILLED, onSelfAssign: fn() },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('button', { name: /Sendeoptionen|Send options/ }));
        await userEvent.click(await body.findByText(/Mich selbst eintragen|Add myself/));
        await expect(args.onSelfAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));
    },
};

/** „Senden & nächste" keeps unit, template and topics as pills, clears the person and focuses E-Mail. */
export const SendAndNext: Story = {
    args: { initialValues: { ...PREFILLED, topicPermission: 'SELECT_EXISTING' }, onSubmit: fn(() => true) },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('button', { name: /Sendeoptionen|Send options/ }));
        await userEvent.click(await body.findByRole('menuitem', { name: /Senden & nächste|Send & next/ }));
        await userEvent.click(await canvas.findByRole('button', { name: SEND.sendAndNext }));
        await waitFor(() =>
            expect(args.onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientEmail: PREFILLED.recipientEmail,
                    sendMode: 'direct',
                    agencyId: 101,
                }),
            ),
        );

        const email = await canvas.findByRole('textbox', { name: FIELD.email });
        await waitFor(() => expect(email).toHaveFocus());
        await expect(email).toHaveValue('');
        await expect(canvas.getByRole('textbox', { name: FIELD.firstName })).toHaveValue('');
        await expect(canvas.getByRole('button', { name: PILL.tenant })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: PILL.agency })).toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: PILL.template })).toHaveTextContent(/Berater:innen-Willkommen/);
        await expect(canvas.getByRole('button', { name: PILL.topics })).toHaveTextContent(
            /Darf weitere Fachbereiche auswählen|may select/i,
        );
        await expect(canvas.getByRole('button', { name: PILL.role })).toHaveTextContent(/Berater:in|Counsellor/);
        // The mode holds for the next person of this session.
        await expect(canvas.getByRole('button', { name: SEND.sendAndNext })).toBeInTheDocument();
    },
};

/** An existing Beratungsstelle picked before any Träger fills in its Träger; „Senden & nächste" keeps both. */
export const AgencyPickFillsTraeger: Story = {
    args: {
        tenantAllowCreate: false,
        initialValues: { recipientEmail: PREFILLED.recipientEmail, firstName: 'Maria', lastName: 'Huber' },
        searchAgencies: async (query: string) =>
            AGENCIES.filter((agency) => matches(agency, query)).map((agency) => ({
                ...agency,
                tenantName: TENANTS.find((tenant) => tenant.id === agency.tenantId)?.name,
            })),
        onSubmit: fn(() => true),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await expect(await canvas.findByRole('combobox', { name: FIELD.tenant })).toHaveValue('');
        const agency = canvas.getByRole('combobox', { name: FIELD.agency });
        await userEvent.click(agency);
        await userEvent.type(agency, 'sucht');
        await userEvent.click(await body.findByRole('option', { name: /Caritas Suchtberatung Freiburg/ }));
        await expect(await canvas.findByRole('button', { name: PILL.tenant })).toHaveAttribute(
            'title',
            'Caritas Südbaden (7)',
        );

        await userEvent.click(canvas.getByRole('button', { name: /Sendeoptionen|Send options/ }));
        await userEvent.click(await body.findByRole('menuitem', { name: /Senden & nächste|Send & next/ }));
        await userEvent.click(await canvas.findByRole('button', { name: SEND.sendAndNext }));
        await waitFor(() =>
            expect(args.onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({ tenantId: 7, tenantIdAllocationMode: 'EXISTING', agencyId: 101 }),
            ),
        );
        await waitFor(() => expect(canvas.getByRole('textbox', { name: FIELD.email })).toHaveValue(''));
        await expect(canvas.getByRole('button', { name: PILL.tenant })).toHaveAttribute(
            'title',
            'Caritas Südbaden (7)',
        );
        await expect(canvas.getByRole('button', { name: PILL.agency })).toBeInTheDocument();
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
        // Only one role on offer: „Rolle" is fixed on „Berater:in".
        const role = canvas.getByRole('combobox', { name: FIELD.role });
        await expect(role.closest('.ant-select')).toHaveTextContent(/Berater:in|Counsellor/);
        await expect(role).toBeDisabled();
        await expect(canvas.getByRole('button', { name: SEND.invite })).toBeInTheDocument();
    },
};

/** Role switch: „Träger-Admin" hides the Beratungsstelle (and „Themen & Fachbereiche"); „BST-Admin" hides only the topics. */
export const RoleHidesFields: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await canvas.findByRole('combobox', { name: FIELD.role }));
        await userEvent.click(await body.findByTitle(/BST-Admin|Agency admin/));
        await waitFor(() => expect(canvas.queryByRole('button', { name: PILL.topics })).not.toBeInTheDocument());
        await expect(canvas.getByRole('combobox', { name: FIELD.agency })).toBeInTheDocument();

        await userEvent.click(canvas.getByRole('button', { name: PILL.role }));
        await userEvent.click(await body.findByTitle(/Träger-Admin|Tenant admin/));
        await waitFor(() => expect(canvas.queryByRole('combobox', { name: FIELD.agency })).not.toBeInTheDocument());
    },
};

/** The Träger tab only founds NEW Träger: „Rolle" is fixed on „Träger-Admin" there. */
export const TraegerTabRoleFixed: Story = {
    args: { allowedRoles: ['TENANT_ADMIN'], defaultRole: 'TENANT_ADMIN', includeAgencyField: false },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const role = await canvas.findByRole('combobox', { name: FIELD.role });
        await expect(role.closest('.ant-select')).toHaveTextContent(/Träger-Admin|Tenant admin/);
        await expect(role).toBeDisabled();
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

// Tapping a pill must bring the field back inside the frame, and the frame must not scroll sideways.
const playTapPillOnPhone: Story['play'] = async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvasElement.firstElementChild as HTMLElement;
    await Promise.all(
        [PILL.email, PILL.firstName, PILL.lastName, PILL.tenant].map((pill) =>
            canvas.findByRole('button', { name: pill }),
        ),
    );
    await userEvent.click(canvas.getByRole('button', { name: PILL.lastName }));
    const expanded = await canvas.findByRole('textbox', { name: /^(Name|Last name)$/ });
    await waitFor(() => expect(expanded).toHaveFocus());
    await expect(expanded).toHaveValue(PREFILLED.lastName);
    const frameBox = frame.getBoundingClientRect();
    await waitFor(() => {
        const box = expanded.getBoundingClientRect();
        expect(box.left).toBeGreaterThanOrEqual(frameBox.left - 1);
        expect(box.right).toBeLessThanOrEqual(frameBox.right + 1);
    });
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth + 1);
};

/** 412px phone: filled fields are pills, and a tapped pill opens inside the screen. */
export const Mobile412: Story = {
    args: { initialValues: PARTLY_FILLED },
    decorators: phoneFrame(412),
    parameters: {
        viewport: { options: { phone412: { name: 'Phone 412', styles: { width: '412px', height: '915px' } } } },
    },
    globals: { viewport: { value: 'phone412', isRotated: false } },
    play: playTapPillOnPhone,
};

/** 320px, the smallest supported phone: same behaviour. */
export const Mobile320: Story = {
    args: { initialValues: PARTLY_FILLED },
    decorators: phoneFrame(320),
    parameters: {
        viewport: { options: { phone320: { name: 'Phone 320', styles: { width: '320px', height: '640px' } } } },
    },
    globals: { viewport: { value: 'phone320', isRotated: false } },
    play: playTapPillOnPhone,
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
                    topicPermission: 'NONE',
                    sendMode: 'direct',
                }),
            ),
        );
    },
};

/** Träger tab as the app wires it: a valid e-mail completes the form — „Anlegen & einladen". */
export const TenantTabValidDirect: Story = {
    render: () => <ComposerHarness />,
    parameters: { msw: { handlers: defaultHandlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(await canvas.findByRole('textbox', { name: FIELD.email }), PREFILLED.recipientEmail);
        await userEvent.type(canvas.getByRole('textbox', { name: FIELD.firstName }), 'Maria');
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name$/ }), 'Huber');

        // A valid address plus names completes the row: the send action becomes ready.
        await waitFor(() => expect(canvas.getByRole('button', { name: SEND.createAndInvite })).toBeEnabled());
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
        // A fresh bar shows the template split button expanded; its main segment opens the dialog.
        await userEvent.click(await canvas.findByRole('button', { name: /Träger-Willkommen/ }));
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
