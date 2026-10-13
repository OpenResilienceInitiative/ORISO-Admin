import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import { Routes, Route, Navigate } from 'react-router-dom';
import i18n from '../../i18n';
import { ManagedEntityStatus } from '.';
import { withAdminProviders, withSeededAdminProviders, setStoryAuth } from '../../utils/storybook/adminStoryDecorators';
import { UserRole } from '../../enums/UserRole';
import { AgencyPageEdit } from '../../pages/Agency/Edit';
import { GeneralTenantSettings } from '../../pages/Tenants/Edit/General';
import { TenantAdminEditOrAdd } from '../../pages/users/TenantAdminEdit';

const account = {
    accountId: 'account-1197',
    username: 'selected-account',
    createDate: '2026-09-01T10:00:00',
    updateDate: null,
    active: true,
    paused: false,
    loginEnabled: true,
    absent: false,
    lifecycleRestricted: false,
    tenantActive: true,
    restrictions: [],
    twoFactor: { required: true, configured: true, active: false },
};
const accountHandlers = () => {
    let active = true;
    return [
        http.get('*/service/useradmin/accounts/account-1197/status', () =>
            HttpResponse.json({ ...account, active, paused: !active }),
        ),
        http.put('*/service/useradmin/accounts/account-1197/status', async ({ request }) => {
            const submitted = (await request.json()) as { active: boolean };
            active = submitted.active;
            return HttpResponse.json({ ...account, active, paused: !active });
        }),
    ];
};
const meta = {
    title: 'Organisms/EntityStatus/ManagedEntityStatus',
    component: ManagedEntityStatus,
    decorators: [(Story) => withAdminProviders(Story)],
    beforeEach: async () => {
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 0);
        await i18n.changeLanguage('de');
    },
    args: {
        entityKind: 'account',
        entityId: 'account-1197',
        canManage: true,
        targetTenantId: 1,
        entityName: 'Selected account',
    },
    parameters: { msw: { handlers: accountHandlers() } },
} satisfies Meta<typeof ManagedEntityStatus>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Account: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await expect(canvas.getByTestId('2fa-required')).toHaveAttribute('data-state', 'true');
        await expect(canvas.getByTestId('2fa-configured')).toHaveAttribute('data-state', 'true');
        await expect(canvas.getByTestId('2fa-active')).toHaveAttribute('data-state', 'false');
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        const control = within(canvas.getByTestId('entity-status-switch')).getByRole('switch');
        control.focus();
        await userEvent.keyboard(' ');
        await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
    },
};

export const TenantReadOnly: Story = {
    args: { entityKind: 'tenant', entityId: '1', entityName: 'Selected organisation' },
    parameters: {
        msw: { handlers: [http.get('*/service/tenantadmin/1', () => HttpResponse.json({ id: 1, active: true }))] },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await expect(canvas.queryByTestId('entity-status-edit')).not.toBeInTheDocument();
        await expect(canvas.getByRole('switch')).toBeDisabled();
    },
};

export const TenantAdminDetails: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 320, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    render: () =>
        withSeededAdminProviders(
            () => (
                <Routes>
                    <Route path="/" element={<Navigate to="/admin/users/tenant-admins/account-1197" replace />} />
                    <Route path="/admin/users/tenant-admins/:id" element={<TenantAdminEditOrAdd />} />
                </Routes>
            ),
            (client) => {
                client.setQueryData(['TENANT_ADMIN', 'account-1197'], {
                    id: 'account-1197',
                    firstname: 'Selected',
                    lastname: 'Administrator',
                    email: 'selected@example.org',
                    tenantId: 1,
                });
                client.setQueryData(['tenant-data', 0], { id: 1, name: 'Demo', settings: {}, licensing: {} });
                client.setQueryData(['TENANTS', undefined, 1000, undefined, 'NAME', 'ASC'], {
                    data: [{ id: 1, name: 'Demo' }],
                    total: 1,
                });
            },
        ),
    parameters: {
        msw: {
            handlers: [
                ...accountHandlers(),
                http.get('*/service/useradmin/tenantadmins/account-1197', () =>
                    HttpResponse.json({
                        _embedded: {
                            id: 'account-1197',
                            firstname: 'Selected',
                            lastname: 'Administrator',
                            email: 'selected@example.org',
                            tenantId: 1,
                        },
                    }),
                ),
                http.get('*/service/tenantadmin/search', () =>
                    HttpResponse.json({ _embedded: [{ id: 1, name: 'Demo' }], total: 1 }),
                ),
                http.get('*/service/tenant/public/*', () =>
                    HttpResponse.json({ id: 1, name: 'Demo', settings: {}, licensing: {} }),
                ),
                http.get('*/service/tenant/1', () =>
                    HttpResponse.json({ id: 1, name: 'Demo', settings: {}, licensing: {} }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByDisplayValue('Selected')).toBeDisabled();
        await waitFor(() => expect(canvas.getByTestId('account-security-info')).toHaveTextContent('selected-account'));
        await expect(canvas.getByTestId('2fa-required')).toHaveAttribute('data-state', 'true');
        await expect(canvas.getByTestId('entity-status-context')).toHaveTextContent('Selected Administrator');
        await expect(canvas.getByTestId('entity-status-context')).toBeVisible();
    },
};

export const SaveRejected: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/useradmin/accounts/account-1197/status', () =>
                    HttpResponse.json({ ...account, active: false, paused: true, restrictions: ['LOGIN_DISABLED'] }),
                ),
                http.put('*/service/useradmin/accounts/account-1197/status', () =>
                    HttpResponse.json({ reason: 'ACCOUNT_RESTRICTED' }, { status: 409 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        await userEvent.click(canvas.getByRole('switch'));
        await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
        await expect(await canvas.findByTestId('entity-status-error')).toHaveTextContent('Einschränkungen');
        await expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        await expect(canvas.getByRole('switch')).toBeChecked();
    },
};
export const UnknownTwoFactor: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/useradmin/accounts/account-1197/status', () =>
                    HttpResponse.json({ ...account, twoFactor: { required: null, configured: null, active: null } }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByTestId('account-security-info')).toHaveTextContent('selected-account'));
        await Promise.all(
            ['required', 'configured', 'active'].map(async (field) => {
                await expect(canvas.getByTestId(`2fa-${field}`)).toHaveAttribute('data-state', 'unknown');
                await expect(canvas.getByTestId(`2fa-${field}`)).toHaveTextContent('Unbekannt');
            }),
        );
    },
};
export const ReadbackUnavailable: Story = {
    parameters: {
        msw: {
            handlers: (() => {
                let written = false;
                return [
                    http.get('*/service/useradmin/accounts/account-1197/status', () =>
                        written ? HttpResponse.json({}, { status: 502 }) : HttpResponse.json(account),
                    ),
                    http.put('*/service/useradmin/accounts/account-1197/status', () => {
                        written = true;
                        return HttpResponse.json({ ...account, active: false, paused: true });
                    }),
                ];
            })(),
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        await userEvent.click(canvas.getByRole('switch'));
        await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
        await expect(await canvas.findByTestId('entity-status-error')).toBeVisible();
        await expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'unknown');
        await expect(canvas.getByTestId('2fa-active')).toHaveAttribute('data-state', 'unknown');
        await expect(within(canvas.getByTestId('entity-status-save')).getByRole('button')).toBeDisabled();
    },
};

const pauseFlow = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'));
    await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
    await userEvent.click(canvas.getByRole('switch'));
    await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
    await waitFor(() => expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'));
};
const organisationHandlers = () => {
    let active = true;
    return [
        http.get('*/service/tenantadmin/1', () => HttpResponse.json({ id: 1, name: 'Preserved organisation', active })),
        http.put('*/service/tenantadmin/1/status', async ({ request }) => {
            const body = (await request.json()) as { active: boolean };
            expect(Object.keys(body)).toEqual(['active']);
            active = body.active;
            return HttpResponse.json({ id: 1, active });
        }),
    ];
};
const centreHandlers = () => {
    let active = true;
    return [
        http.get('*/service/agencyadmin/agencies/7/status', () =>
            HttpResponse.json({ agencyId: 7, active, ownActive: active, tenantActive: true, restrictions: [] }),
        ),
        http.put('*/service/agencyadmin/agencies/7/status', async ({ request }) => {
            const body = (await request.json()) as { active: boolean };
            expect(Object.keys(body)).toEqual(['active']);
            active = body.active;
            return HttpResponse.json({ agencyId: 7, active, ownActive: active, tenantActive: true, restrictions: [] });
        }),
    ];
};
const ownTenantAuth = async () => {
    setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin], 1);
    await i18n.changeLanguage('de');
};
export const Tenant: Story = {
    beforeEach: ownTenantAuth,
    args: { entityKind: 'tenant', entityId: '1', entityName: 'Selected organisation' },
    parameters: { msw: { handlers: organisationHandlers() } },
    play: pauseFlow,
};
export const Centre: Story = {
    beforeEach: ownTenantAuth,
    args: { entityKind: 'agency', entityId: '7', entityName: 'Selected counselling centre', targetTenantId: 1 },
    parameters: { msw: { handlers: centreHandlers() } },
    play: pauseFlow,
};
export const Pending: Story = {
    parameters: {
        msw: {
            handlers: (() => {
                let active = true;
                return [
                    http.get('*/service/useradmin/accounts/account-1197/status', () =>
                        HttpResponse.json({ ...account, active, paused: !active }),
                    ),
                    http.put('*/service/useradmin/accounts/account-1197/status', async () => {
                        await delay(250);
                        active = false;
                        return HttpResponse.json({ ...account, active, paused: true });
                    }),
                ];
            })(),
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        await userEvent.click(canvas.getByRole('switch'));
        await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
        await expect(await canvas.findByTestId('entity-status-pending')).toBeVisible();
        await expect(canvas.getByRole('switch')).toBeDisabled();
        await expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true');
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
    },
};
export const English: Story = {
    beforeEach: async () => {
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 0);
        await i18n.changeLanguage('en');
    },
    parameters: { msw: { handlers: accountHandlers() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByTestId('account-security-info')).toHaveTextContent('selected-account'));
        await expect(canvas.getByTestId('entity-status-confirmed')).toHaveTextContent('Active');
        await expect(canvas.getByText('2FA configured')).toBeVisible();
        await expect(within(canvas.getByTestId('entity-status-edit')).getByRole('button')).toHaveAccessibleName('Edit');
    },
};
const mobilePlay = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('account-security-info')).toHaveTextContent('selected-account'));
    const card = canvas.getByTestId('entity-status-card');
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    await expect(canvas.getByTestId('2fa-required')).toBeVisible();
};
export const Mobile320: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 320, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { msw: { handlers: accountHandlers() } },
    play: mobilePlay,
};
export const Mobile412: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 412, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { msw: { handlers: accountHandlers() } },
    play: mobilePlay,
};

const tenantFixture = {
    id: 1,
    name: 'Selected organisation',
    subdomain: 'selected',
    active: true,
    licensing: { allowedNumberOfUsers: 5 },
    settings: {},
    content: {},
    theming: {},
};
export const TenantMetadataPreservesStatus: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 320, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    render: () =>
        withSeededAdminProviders(
            () => (
                <Routes>
                    <Route path="/" element={<Navigate to="/admin/tenants/1/general" replace />} />
                    <Route path="/admin/tenants/:id/general" element={<GeneralTenantSettings />} />
                    <Route path="/admin/tenants" element={<p>Metadata saved; paused status preserved</p>} />
                </Routes>
            ),
            (client) => {
                client.setQueryData(['TENANT', 1], tenantFixture);
            },
        ),
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/tenantadmin/1', () => HttpResponse.json(tenantFixture)),
                http.get('*/service/tenant/public/*', () => HttpResponse.json(tenantFixture)),
                http.put('*/service/tenantadmin/1', async ({ request }) => {
                    const body = (await request.json()) as Record<string, unknown>;
                    return 'active' in body
                        ? HttpResponse.json({}, { status: 409 })
                        : HttpResponse.json({ ...tenantFixture, ...body, active: false });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const field = await canvas.findByDisplayValue('Selected organisation');
        await expect(await canvas.findByTestId('entity-status-context')).toHaveTextContent('Selected organisation');
        const card = field.closest('[data-testid="card-editable"]') ?? field.closest('section') ?? canvasElement;
        await userEvent.click(within(card as HTMLElement).getByRole('button', { name: /Bearbeiten/ }));
        await userEvent.clear(field);
        await userEvent.type(field, 'Updated organisation');
        await userEvent.click(within(card as HTMLElement).getByRole('button', { name: /Speichern/ }));
        await expect(await canvas.findByText('Metadata saved; paused status preserved')).toBeVisible();
    },
};

export const CentreParentPaused: Story = {
    beforeEach: ownTenantAuth,
    args: { entityKind: 'agency', entityId: '7', entityName: 'Selected counselling centre', targetTenantId: 1 },
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/agencyadmin/agencies/7/status', () =>
                    HttpResponse.json({
                        agencyId: 7,
                        active: false,
                        ownActive: true,
                        tenantActive: false,
                        restrictions: ['tenant_inactive'],
                    }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await expect(canvas.getByTestId('entity-status-own-active')).toHaveAttribute('data-active', 'true');
        await expect(canvas.getByText('Der Träger ist inaktiv.')).toBeVisible();
    },
};
export const CentreForeignAssignment: Story = {
    beforeEach: async () => {
        setStoryAuth([UserRole.AgencyAdmin, UserRole.UserAdmin], 1);
        await i18n.changeLanguage('de');
    },
    args: { entityKind: 'agency', entityId: '7', entityName: 'Other counselling centre', targetTenantId: 1 },
    parameters: {
        msw: {
            handlers: [
                ...centreHandlers(),
                http.get('*/service/useradmin/self-assignments', () =>
                    HttpResponse.json({ agencyAdminAgencyIds: [8], consultantAgencyIds: [] }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await expect(canvas.queryByTestId('entity-status-edit')).not.toBeInTheDocument();
        await expect(canvas.getByRole('switch')).toBeDisabled();
    },
};

const centreFixture = {
    online: true,
    id: '7',
    name: 'Selected counselling centre',
    tenantId: 1,
    city: 'Demo city',
    postcode: '12345',
    topics: [],
    counsellingRelations: [],
    offline: false,
    settings: {},
    consultingType: '1',
    teamAgency: false,
    dataProtection: {
        dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE',
        agencyDataProtectionResponsibleContact: null,
        alternativeDataProtectionRepresentativeContact: null,
        dataProtectionOfficerContact: null,
    },
    content: {},
};
export const CentreDetailsMobile: Story = {
    beforeEach: ownTenantAuth,
    decorators: [
        (Story) => (
            <div style={{ width: 320, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    render: () =>
        withSeededAdminProviders(
            () => (
                <Routes>
                    <Route path="/" element={<Navigate to="/admin/agency/7/general" replace />} />
                    <Route path="/admin/agency/:id/general" element={<AgencyPageEdit />} />
                </Routes>
            ),
            (client) => {
                client.setQueryData(['AGENCY', '7'], centreFixture);
                client.setQueryData(['AGENCY_POST_CODES', '7'], []);
                client.setQueryData(['ALL_TOPICS', true], []);
                client.setQueryData(['TRAEGER_DPO', 1], null);
            },
        ),
    parameters: {
        msw: {
            handlers: [
                ...centreHandlers(),
                http.get('*/service/agencyadmin/agencies/7', () => HttpResponse.json({ _embedded: centreFixture })),
                http.get('*/service/agencyadmin/agencies/7/*', () => HttpResponse.json([])),
                http.get('*/service/tenantadmin/*', () => HttpResponse.json(tenantFixture)),
                http.get('*/service/topic*', () => HttpResponse.json([])),
                http.get('*/service/tenant/public/*', () => HttpResponse.json(tenantFixture)),
                http.get('*/service/useradmin/consultants/search*', () =>
                    HttpResponse.json({ _embedded: [], total: 0 }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const context = await canvas.findByTestId('entity-status-context');
        await expect(context).toHaveTextContent('Selected counselling centre');
        await expect(context).toBeVisible();
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
    },
};

export const CentreMetadataPreservesStatus: Story = {
    ...CentreDetailsMobile,
    parameters: {
        msw: {
            handlers: (() => {
                let current = { ...centreFixture };
                return [
                    ...centreHandlers(),
                    http.get('*/service/agencyadmin/agencies/7', () => HttpResponse.json({ _embedded: current })),
                    http.put('*/service/agencyadmin/agencies/7', async ({ request }) => {
                        const body = (await request.json()) as Record<string, unknown>;
                        if ('offline' in body) return HttpResponse.json({}, { status: 409 });
                        current = { ...current, name: String(body.name), offline: true };
                        return HttpResponse.json({ _embedded: current });
                    }),
                    http.get('*/service/agencyadmin/agencies/7/*', () => HttpResponse.json([])),
                    http.get('*/service/tenantadmin/*', () => HttpResponse.json(tenantFixture)),
                    http.get('*/service/topic*', () => HttpResponse.json([])),
                    http.get('*/service/tenant/public/*', () => HttpResponse.json(tenantFixture)),
                    http.get('*/service/useradmin/consultants/search*', () =>
                        HttpResponse.json({ _embedded: [], total: 0 }),
                    ),
                ];
            })(),
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const field = await canvas.findByDisplayValue('Selected counselling centre');
        const card = field.closest('form')?.parentElement;
        if (!card) throw new Error('Real metadata card missing');
        await userEvent.click(within(card).getByRole('button', { name: /Bearbeiten/ }));
        await userEvent.clear(field);
        await userEvent.type(field, 'Updated counselling centre');
        await userEvent.click(within(card).getByRole('button', { name: /Speichern/ }));
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-context')).toHaveTextContent('Updated counselling centre'),
        );
    },
};

const failedPutHandlers = () => [
    http.get('*/service/useradmin/accounts/account-1197/status', () =>
        HttpResponse.json({ ...account, active: false, paused: true }),
    ),
    http.put('*/service/useradmin/accounts/account-1197/status', () => HttpResponse.json({}, { status: 502 })),
];
const failedPutPlay = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'));
    await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
    await userEvent.click(canvas.getByRole('switch'));
    await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
    const error = await canvas.findByTestId('entity-status-error');
    await expect(error).toHaveTextContent(i18n.t('entityStatus.error.save'));
    await expect(error).toBeVisible();
    await expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
    await expect(canvas.getByRole('switch')).toBeChecked();
    await expect(within(canvas.getByTestId('entity-status-save')).getByRole('button')).toBeEnabled();
    const card = canvas.getByTestId('entity-status-card');
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    await expect(error.scrollWidth).toBeLessThanOrEqual(error.clientWidth);
    await expect(error.getBoundingClientRect().height).toBeGreaterThan(
        Number.parseFloat(getComputedStyle(error).lineHeight),
    );
};
export const FailedPutGerman320: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 320, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { msw: { handlers: failedPutHandlers() } },
    play: failedPutPlay,
};
export const FailedPutEnglish390: Story = {
    beforeEach: English.beforeEach,
    decorators: [
        (Story) => (
            <div style={{ width: 390, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
    parameters: { msw: { handlers: failedPutHandlers() } },
    play: failedPutPlay,
};

const prerequisiteRefusal = (reason: string, instruction: string): Story => ({
    args: { entityKind: 'agency', entityId: '7', entityName: 'Selected counselling centre', targetTenantId: 1 },
    parameters: {
        msw: {
            handlers: [
                http.get('*/service/agencyadmin/agencies/7/status', () =>
                    HttpResponse.json({
                        agencyId: 7,
                        active: false,
                        ownActive: false,
                        tenantActive: true,
                        restrictions: [],
                    }),
                ),
                http.put('*/service/agencyadmin/agencies/7/status', () =>
                    HttpResponse.json({ reason }, { status: 400, headers: { 'X-Reason': reason } }),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await waitFor(() =>
            expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await userEvent.click(within(canvas.getByTestId('entity-status-edit')).getByRole('button'));
        await userEvent.click(canvas.getByRole('switch'));
        await userEvent.click(within(canvas.getByTestId('entity-status-save')).getByRole('button'));
        await expect(await canvas.findByRole('alert')).toHaveTextContent(instruction);
        await expect(canvas.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
    },
});
export const ActivationNeedsCounsellor: Story = prerequisiteRefusal(
    'AGENCY_CONTAINS_NO_CONSULTANTS',
    'Ordne der Beratungsstelle zuerst mindestens eine beratende Person zu.',
);
export const ActivationNeedsPostcodeCoverageEnglish: Story = {
    ...prerequisiteRefusal('INVALID_OFFLINE_STATUS', 'Set the counselling centre’s postcode coverage first.'),
    beforeEach: async () => {
        setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 0);
        await i18n.changeLanguage('en');
    },
};
