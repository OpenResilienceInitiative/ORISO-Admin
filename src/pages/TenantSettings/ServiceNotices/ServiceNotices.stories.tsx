import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { ServiceNoticesPage } from './index';
import { App } from '../../../App';
import routePathNames from '../../../appConfig';
import {
    SERVICE_NOTICE_VARIANTS,
    type ServiceNoticeDraft,
    type ServiceNoticeDraftInput,
} from '../../../api/serviceNotices/serviceNotices';

const endpoint = '*/service/users/admin/service-notices/drafts/:campaignKey';
const input: ServiceNoticeDraftInput = {
    maintenanceDate: '2026-12-01',
    maintenanceStart: '09:00',
    maintenanceEnd: '10:00',
    statusUrl: 'https://status.example.org/planned',
};
const saved: ServiceNoticeDraft = { ...input, campaignKey: 'planned-window', status: 'DRAFT' };
const variantLabels = {
    'de-sie': 'Deutsch — Sie',
    'de-du': 'Deutsch — Du',
    en: 'Englisch',
    fr: 'Französisch',
    ru: 'Russisch',
    ti: 'Tigrinya',
    tr: 'Türkisch',
};

const fixtureHandlers = () => {
    let stored: ServiceNoticeDraft | null = null;
    const requests: Array<{ method: string; key: string; input?: unknown; authorized: boolean }> = [];
    return {
        requests,
        handlers: [
            http.put(endpoint, async ({ request, params }) => {
                const body = (await request.json()) as ServiceNoticeDraftInput;
                const authorized = request.headers.has('Authorization');
                requests.push({ method: 'PUT', key: String(params.campaignKey), input: body, authorized });
                if (!authorized) return new HttpResponse(null, { status: 403 });
                const next = { ...body, campaignKey: String(params.campaignKey), status: 'DRAFT' as const };
                if (stored && JSON.stringify(stored) !== JSON.stringify(next))
                    return new HttpResponse(null, { status: 409 });
                stored = next;
                return HttpResponse.json(stored);
            }),
            http.get(endpoint, ({ request, params }) => {
                requests.push({
                    method: 'GET',
                    key: String(params.campaignKey),
                    authorized: request.headers.has('Authorization'),
                });
                if (!stored || stored.campaignKey !== params.campaignKey)
                    return new HttpResponse(null, { status: 404 });
                return HttpResponse.json(stored);
            }),
            http.get(`${endpoint}/preview`, ({ request, params }) => {
                const variant = new URL(request.url).searchParams.get('variant');
                requests.push({
                    method: 'PREVIEW',
                    key: String(params.campaignKey),
                    authorized: request.headers.has('Authorization'),
                });
                if (!stored) return new HttpResponse(null, { status: 404 });
                return HttpResponse.json({
                    campaignKey: stored.campaignKey,
                    variant,
                    subject: `Configured product · ${variant}`,
                    preheader: `Planned window · ${variant}`,
                    html: `<!doctype html><html lang="${variant}"><body><h1>Configured product</h1><p>${stored.maintenanceDate} ${stored.maintenanceStart}–${stored.maintenanceEnd}</p><a href="${stored.statusUrl}">Status page</a></body></html>`,
                    text: `Saved window ${variant}: ${stored.maintenanceDate} ${stored.maintenanceStart}–${stored.maintenanceEnd}\n${stored.statusUrl}`,
                });
            }),
        ],
    };
};

const meta = {
    title: 'Organisms/Pages/Settings/ServiceNotices',
    component: ServiceNoticesPage,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0);
            return withAdminProviders(Story);
        },
    ],
} satisfies Meta<typeof ServiceNoticesPage>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Real Admin route and native role/2FA gate, with a synthetic enrolled operator fixture. */
const ExistingPlatformRoute = () => {
    const client = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        client.setQueryDefaults(['user-data'], { staleTime: Infinity });
        client.setQueryDefaults(['tenant-data'], { staleTime: Infinity });
        client.setQueryData(['user-data'], { id: 'operator-fixture', twoFactorAuth: { isActive: true } });
        client.setQueryData(['tenant-data', 0], { id: 0, settings: {}, licensing: {} });
        navigate(routePathNames.serviceNotices, { replace: true });
        setReady(true);
    }, [client, navigate]);
    return ready && location.pathname === routePathNames.serviceNotices ? (
        <>
            <output data-testid="service-notice-route">{location.pathname}</output>
            <App />
        </>
    ) : null;
};

export const PlatformRoute: Story = {
    render: () => <ExistingPlatformRoute />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByLabelText('Entwurfsreferenz');
        await expect(canvas.getByTestId('service-notice-route')).toHaveTextContent(
            '/admin/theme-settings/service-notices',
        );
        await expect(canvas.getByLabelText('Öffentliche Statusseiten-URL')).toHaveValue('');
        ['Beginn', 'Ende'].forEach((name) => {
            const clockInput = canvas.getByLabelText(name);
            const label = canvas.getByText(name, { selector: 'label' });
            expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(clockInput.getBoundingClientRect().top);
        });
        await expect(canvas.getByRole('link', { name: 'Systemhinweise' })).toHaveAttribute(
            'href',
            routePathNames.serviceNotices,
        );
    },
};

const fill = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    const change = (label: string, value: string) => {
        const element = canvas.getByLabelText<HTMLInputElement>(label);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (!setter) throw new Error('Native input setter is required');
        setter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await userEvent.type(canvas.getByLabelText('Entwurfsreferenz'), saved.campaignKey);
    change('Wartungsdatum', input.maintenanceDate);
    change('Beginn', input.maintenanceStart);
    change('Ende', input.maintenanceEnd);
    await userEvent.type(canvas.getByLabelText('Öffentliche Statusseiten-URL'), input.statusUrl);
};

const savedFixture = fixtureHandlers();
export const SaveReopenAndSevenPreviews: Story = {
    parameters: { msw: { handlers: savedFixture.handlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByLabelText('Öffentliche Statusseiten-URL')).toHaveValue('');
        await expect(canvas.queryByTestId('service-notice-preview-frame')).not.toBeInTheDocument();
        await fill(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Entwurf speichern' }));
        await canvas.findByText('Configured product · de-sie');
        await expect(savedFixture.requests[0]).toMatchObject({
            method: 'PUT',
            key: saved.campaignKey,
            input,
            authorized: true,
        });
        await userEvent.click(canvas.getByRole('button', { name: 'Gespeicherten Entwurf öffnen' }));
        await waitFor(() => expect(savedFixture.requests.some((request) => request.method === 'GET')).toBe(true));
        await userEvent.click(canvas.getByRole('button', { name: 'Entwurf speichern' }));
        await waitFor(() =>
            expect(savedFixture.requests.filter((request) => request.method === 'PUT')).toHaveLength(2),
        );
        await SERVICE_NOTICE_VARIANTS.slice(1).reduce(async (previous, variant) => {
            await previous;
            await userEvent.click(canvas.getByRole('combobox', { name: 'E-Mail-Sprache' }));
            await userEvent.click(
                within(await within(canvasElement.ownerDocument.body).findByRole('listbox')).getByRole('option', {
                    name: variantLabels[variant],
                }),
            );
            await canvas.findByText(`Configured product · ${variant}`);
            await expect(canvas.getByText(`Planned window · ${variant}`)).toBeInTheDocument();
        }, Promise.resolve());
        const frame = canvas.getByTestId('service-notice-preview-frame');
        await expect(frame).toHaveAttribute('sandbox', '');
        await expect(frame).toHaveAttribute('srcdoc', expect.stringContaining('Status page'));
        await expect(savedFixture.requests).toHaveLength(10);
        await expect(savedFixture.requests.every((request) => request.authorized)).toBe(true);
        await expect(canvas.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'Entwurf speichern',
            'Gespeicherten Entwurf öffnen',
            // Saving offers counting only; sending needs a count and a confirmation first.
            'Empfänger zählen',
        ]);
    },
};

const conflictFixture = fixtureHandlers();
export const ConflictKeepsInputs: Story = {
    parameters: { msw: { handlers: conflictFixture.handlers } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await fill(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Entwurf speichern' }));
        await canvas.findByText('Configured product · de-sie');
        const url = canvas.getByLabelText('Öffentliche Statusseiten-URL');
        await userEvent.clear(url);
        await userEvent.type(url, 'https://changed.example.org');
        await userEvent.click(canvas.getByRole('button', { name: 'Entwurf speichern' }));
        await canvas.findByText(
            'Diese Referenz gehört zu einem anderen Entwurf. Ihre Eingaben bleiben erhalten. Verwenden Sie für einen neuen Entwurf eine andere Referenz.',
        );
        await expect(url).toHaveValue('https://changed.example.org');
        await expect(canvas.getByText('Configured product · de-sie')).toBeInTheDocument();
        await expect(conflictFixture.requests.filter((request) => request.method === 'PUT')).toHaveLength(2);
    },
};

export const TechnicalAccountDenied: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.Technical], 0);
            return withAdminProviders(Story);
        },
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Nur ein Plattform-Admin kann diese Entwürfe verwalten.',
        );
        await expect(canvas.queryByLabelText('Entwurfsreferenz')).not.toBeInTheDocument();
    },
};
