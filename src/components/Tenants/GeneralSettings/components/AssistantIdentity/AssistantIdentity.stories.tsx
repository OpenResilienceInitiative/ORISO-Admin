import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { AssistantIdentity } from './index';
import { walkThroughTileHelp } from '../../../../TileHelp/tileHelpStory.matrix';
import { TENANT_DATA_KEY } from '../../../../../hooks/useTenantData.hook';
import { baseTenantPublicEndpoint, tenantAdminEndpoint } from '../../../../../appConfig';
import { findPopup, popupsOf } from '../../../../../test/storyPopups';

const storageKey = 'storybook:assistant-1150';
const defaultTenant = {
    id: 1,
    name: 'Example organisation',
    subdomain: 'example',
    adminEmails: [],
    settings: {},
    licensing: {},
    content: {},
    theming: { assistantName: 'Carimat', assistantIcon: 'default', primaryColor: '#a5000a' },
};
const tenant = () => {
    try {
        return JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultTenant;
    } catch {
        return defaultTenant;
    }
};
const Harness = ({ readOnly = false, seeded = true }: { readOnly?: boolean; seeded?: boolean }) => {
    const [client] = useState(() => {
        const query = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        if (seeded) query.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], tenant());
        return query;
    });
    return (
        <QueryClientProvider client={client}>
            <AssistantIdentity tenantId="1" readOnly={readOnly} />
        </QueryClientProvider>
    );
};
const meta = {
    title: 'Organisms/Tenants/AssistantIdentity',
    component: Harness,
    beforeEach: () => {
        localStorage.removeItem(storageKey);
    },
    parameters: {
        layout: 'padded',
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(tenant())),
                http.get(`${tenantAdminEndpoint}/1`, () => HttpResponse.json(tenant())),
                http.put(`${tenantAdminEndpoint}/1`, async ({ request }) => {
                    const saved = await request.json();
                    localStorage.setItem(storageKey, JSON.stringify(saved));
                    return HttpResponse.json(saved);
                }),
            ],
        },
    },
} satisfies Meta<typeof Harness>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SaveAndReload: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /Edit|Bearbeiten/i }));
        const name = canvas.getByLabelText(/Display name|Anzeigename/i);
        await userEvent.clear(name);
        await userEvent.type(name, 'Help companion');
        await userEvent.click(canvas.getByLabelText(/Robot 2|Roboter 2/i));
        await userEvent.click(canvas.getByRole('button', { name: /Save|Speichern/i }));
        await waitFor(() => expect(tenant().theming.assistantName).toBe('Help companion'));
        await waitFor(() => expect(tenant().theming.assistantIcon).toBe('robot-1184077'));
    },
};
export const ReadOnly: Story = { args: { readOnly: true } };

export const HelpSlideshow: Story = {
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};

let tenantRequests = 0;
let tenantRecovered = false;
/**
 * T6: the Träger's data cannot be read - one error pop-up titled "Assistent" with "Erneut versuchen"; the tile
 * says "Dieser Bereich konnte nicht geladen werden." The retry asks again and the form appears.
 */
export const LoadErrorRetry: Story = {
    args: { seeded: false },
    parameters: {
        msw: {
            handlers: [
                http.get(`${baseTenantPublicEndpoint}/id/1`, () => HttpResponse.json(tenant())),
                http.get(`${tenantAdminEndpoint}/1`, () => {
                    tenantRequests += 1;
                    return tenantRecovered ? HttpResponse.json(tenant()) : new HttpResponse(null, { status: 500 });
                }),
            ],
        },
    },
    beforeEach: () => {
        tenantRequests = 0;
        tenantRecovered = false;
    },
    play: async ({ canvasElement }) => {
        const popup = await findPopup(canvasElement, 'Die Einstellungen konnten nicht geladen werden', 'error');
        await expect(popup).toHaveTextContent('Assistent');
        const before = tenantRequests;
        tenantRecovered = true;
        await userEvent.click(within(popup).getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(tenantRequests).toBeGreaterThan(before));
        await expect(await within(canvasElement).findByLabelText(/Anzeigename/)).toBeInTheDocument();
        await waitFor(() => expect(popupsOf(canvasElement)).toHaveLength(0));
    },
};
